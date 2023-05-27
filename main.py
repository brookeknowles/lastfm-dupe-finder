from collections import defaultdict
from enum import Enum
from pprint import pprint
from typing import List, Union

import requests

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
) -> Union[int, str]:
    """
    Initial API call to get the number of pages to be fetched for given method

    :param username: Last.fm username to retrieve pages for
    :param method: String indicating the type of data (ALBUMS or TRACKS)
    :return: Number of pages of data to retrieve
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
) -> Union[dict, str]:
    """
    Fetches data via the Last.fm API for a given username and method

    :param username: Last.fm username to retrieve pages for
    :param method: String indicating the type of data (ALBUMS or TRACKS)
    :param limit: Number of results to fetch per page (optional, defaults to 500)
    :param page: The page number to fetch data from (optional, defaults to 1)
    :return: JSON dictionary response from the Last.fm API
    """
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


def get_top_albums(username: str) -> List[dict]:
    """
    Fetches every album the given user has scrobbled, ordered by playcount

    :param username: Last.fm username to retrieve album data for
    :return: List of dictionaries where each dict represents one album
    """
    pages = get_pages(username=username, method=Method.ALBUMS.value)
    page = 1
    top_albums = []
    while page < pages + 1:
        raw_data = get_lastfm_data(username=username, method=Method.ALBUMS.value, page=page)
        album_data = []
        for album in raw_data['topalbums']['album']:
            data = {
                'artist': album['artist']['name'],
                'title': album['name'],
                'playcount': int(album['playcount']),
                'url': album['url']
            }
            album_data.append(data)

        page += 1
        top_albums.extend(album_data)
    return top_albums


def get_top_tracks(username: str) -> List[dict]:
    """
    Fetches every track the given user has scrobbled, ordered by playcount

    :param username: Last.fm username to retrieve album data for
    :return: List of dictionaries where each dict represents one track
    """
    pages = get_pages(username=username, method=Method.TRACKS.value)
    page = 1
    top_songs = []
    while page < pages + 1:
        raw_data = get_lastfm_data(username=username, method=Method.TRACKS.value, page=page)
        track_data = []
        for track in raw_data['toptracks']['track']:
            data = {
                'artist': track['artist']['name'],
                'title': track['name'],
                'playcount': int(track['playcount']),
                'url': track['url']
            }
            track_data.append(data)

        page += 1
        top_songs.extend(track_data)
    return top_songs


def remove_strings(title: str, method: str) -> str:
    """
    Strips each album/track title of any extra stuff that should be removed (e.g. 'remix')

    :param title: The title to strip
    :param method: String indicating the type of data (ALBUMS or TRACKS)
    :return: The title stripped of it's extra unneeded characters
    """
    for string in strings_to_remove(method):
        title = title.replace(string, '').strip()
    return title


def strings_to_remove(method: str) -> List[str]:
    """
    The extra characters that need to be removed from the album and track titles

    :param method: String indicating the type of data (ALBUMS or TRACKS)
    :return: List of extra characters that need to be removed if they exist in a title
    """
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


def find_duplicates(data: List[dict], method: str) -> List[dict]:
    """
    Finds all duplicates in a user's Last.fm library

    :param data: List of dictionaries containing the Last.fm data
    :param method: String indicating the type of data (ALBUMS or TRACKS)
    :return: List of dictionaries representing the duplicate information
    """
    duplicates = defaultdict(list)

    for item in data:
        artist = item['artist']
        title = item['title']
        base_title = remove_strings(title, method)
        duplicates[(base_title, artist)].append(item)

    duplicate_info = []

    for key, values in duplicates.items():
        base_title, artist = key
        version_count = len(values)

        if version_count > 1:  # Only include items with version_count > 1
            versions = []

            for item in values:
                version = {
                    'title': item['title'],
                    'playcount': item['playcount'],
                    'url': item['url']
                }

                versions.append(version)

            total_playcount = sum(item['playcount'] for item in values)

            duplicate_dict = {
                'base-title': base_title,
                'artist': artist,
                'total-playcount': total_playcount,
                'version-count': version_count,
                'versions': versions
            }

            duplicate_info.append(duplicate_dict)

    # Sort the duplicate information by the version count (from highest to lowest)
    duplicate_info.sort(key=lambda x: x['version-count'], reverse=True)

    return duplicate_info
