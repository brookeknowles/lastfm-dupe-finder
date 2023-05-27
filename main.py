import requests
from enum import Enum
from collections import defaultdict
from pprint import pprint
from typing import List
import time

from config import get_api_key, get_api_secret, get_user_agent


class Method(Enum):
    ALBUMS = 'user.gettopalbums'
    TRACKS = 'user.gettoptracks'


# Last FM API setup
API_KEY = get_api_key()
API_SECRET = get_api_secret()
USER_AGENT = get_user_agent()


def get_pages(
    username: str,
    method: str,
):
    """
    Initial API call to get the number of pages to be fetched for given method
    :return:
    """
    headers = {
        'user-agent': USER_AGENT
    }
    payload = {
        'api_key': API_KEY,
        'method': method,
        'format': 'json',
        'user': username,
        'limit': 500,
        'page': 1
    }
    url = 'https://ws.audioscrobbler.com/2.0/'
    r = requests.get(url, headers=headers, params=payload)

    if r.status_code != 200:
        return f"Exception occurred with status code: {r.status_code}.\nError: {r.text}"

    else:
        response = r.json()
        if method == Method.ALBUMS.value:
            pages = int(response['topalbums']['@attr']['totalPages'])
        elif method == Method.TRACKS.value:
            pages = int(response['toptracks']['@attr']['totalPages'])
        else:
            pages = 1
        return pages


def get_lastfm_data(
    username: str,
    method: str,
    limit: int = 500,
    page: int = 1
):
    headers = {
        'user-agent': USER_AGENT
    }

    payload = {
        'api_key': API_KEY,
        'method': method,
        'format': 'json',
        'user': username,
        'limit': limit,
        'page': page
    }

    url = 'https://ws.audioscrobbler.com/2.0/'
    r = requests.get(url, headers=headers, params=payload)

    if r.status_code != 200:
        return f"Exception occurred with status code: {r.status_code}.\nError: {r.text}"

    else:
        response = r.json()
        return response


def get_top_albums(username: str):
    pages = get_pages(username=username, method=Method.ALBUMS.value)
    page = 1
    top_albums = []
    while page < pages + 1:
        raw_data = get_lastfm_data(username=username, method=Method.ALBUMS.value, page=page)
        album_data = []
        for album in raw_data['topalbums']['album']:
            data = {
                'artist': album['artist']['name'],
                'title': album['name']
            }
            album_data.append(data)

        page += 1
        top_albums.extend(album_data)
    return top_albums


def get_top_tracks(username: str):
    pages = get_pages(username=username, method=Method.TRACKS.value)
    page = 1
    top_songs = []
    while page < pages + 1:
        raw_data = get_lastfm_data(username=username, method=Method.TRACKS.value, page=page)
        track_data = []
        for track in raw_data['toptracks']['track']:
            data = {
                'artist': track['artist']['name'],
                'title': track['name']
            }
            track_data.append(data)

        page += 1
        top_songs.extend(track_data)
    return top_songs


def remove_strings(title: str, method) -> str:
    for string in strings_to_remove(method):
        title = title.replace(string, '').strip()
    return title


def strings_to_remove(method) -> List[str]:
    if method == Method.ALBUMS:
        return [
            ' (Deluxe)',
            ' (Deluxe Edition)',
            ' (Digital Deluxe Version)',
            ' (Special Edition)',
            ' (Acoustic)'
        ]
    elif method == Method.TRACKS:
        return [
            ' - Remix',
            ' (Acoustic)',
            ' (Acoustic version)',
            ' (Remix)',
            ' - Acoustic'
        ]
    else:
        return []


def find_duplicates(data, method):
    """
    Finds all duplicates in a users last fm library
    :return:
    """
    duplicates = defaultdict(list)

    for item in data:
        artist = item['artist']
        title = item['title']
        base_title = remove_strings(title, method)
        duplicates[(base_title, artist)].append(title)

    duplicate_info = []

    for key, values in duplicates.items():
        base_title, artist = key
        version_count = len(values)

        if version_count > 1:  # Only include items with version_count > 1
            versions = values
            duplicate_dict = {
                'base-title': base_title,
                'artist': artist,
                'version-count': version_count,
                'versions': versions
            }
            duplicate_info.append(duplicate_dict)

    # Sort the duplicate information by the version count (from highest to lowest)
    duplicate_info.sort(key=lambda x: x['version-count'], reverse=True)

    return duplicate_info


if __name__ == '__main__':
    username = "brookeyuh"
    data = get_top_tracks(username)
    print(find_duplicates(data, Method.TRACKS))
