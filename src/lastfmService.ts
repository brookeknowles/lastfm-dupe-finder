import axios, {AxiosRequestConfig} from 'axios';
import {getApiKey, getUserAgent} from './config';
import {Album, DuplicateInfo, Item, Track} from './models';
import {Method} from './enums';


// Last FM API setup
const API_KEY = getApiKey();
const USER_AGENT = getUserAgent();

async function getPages(username: string, method: string): Promise<number | string> {
  const headers = {
    'user-agent': USER_AGENT,
  };
  const payload = {
    api_key: API_KEY,
    method,
    format: 'json',
    user: username,
    limit: 500,
    page: 1,
  };
  const url = 'https://ws.audioscrobbler.com/2.0/';

  try {
    console.log("getting number of pages to fetch...")
    const response = await axios.get(url, { headers, params: payload } as AxiosRequestConfig);

    if (response.status !== 200) {
      return `Exception occurred with status code: ${response.status}.\nError: ${response.data}`;
    }

    const { topalbums, toptracks } = response.data;
    return method === Method.ALBUMS ? parseInt(topalbums['@attr'].totalPages) : parseInt(toptracks['@attr'].totalPages);
  } catch (error) {
    return `Exception occurred: ${error.message}`;
  }
}

async function getLastFmData(username: string, method: string, limit = 500, page = 1): Promise<any | string> {
  const headers = {
    'user-agent': USER_AGENT,
  };
  const payload = {
    api_key: API_KEY,
    method,
    format: 'json',
    user: username,
    limit,
    page,
  };
  const url = 'https://ws.audioscrobbler.com/2.0/';

  try {
    const response = await axios.get(url, { headers, params: payload } as AxiosRequestConfig);

    if (response.status !== 200) {
      return `Exception occurred with status code: ${response.status}.\nError: ${response.data}`;
    }

    return response.data;
  } catch (error) {
    return `Exception occurred: ${error.message}`;
  }
}

function findDuplicates<T extends Item>(items: T[]): DuplicateInfo<T>[] {
  const duplicateInfo: DuplicateInfo<T>[] = [];

  const removeStrings = (str: string): string => {
    return str.replace(/\(.*\)/g, "").trim();
  };

  items.forEach((item, index) => {
    const title = removeStrings('title' in item ? (item as { title: string }).title : (item as { name: string }).name);
    const artist = item.artist;
    const playcount = item.playcount;

    const duplicate = duplicateInfo.find((info) => {
      return info.title === title && info.artist === artist;
    });

    if (duplicate) {
      duplicate["total-playcount"] += playcount;
      duplicate.versions.push({ ...(item as T) });
    } else {
      duplicateInfo.push({
        title,
        artist,
        "total-playcount": playcount,
        versions: [{ ...(item as T) }],
      });
    }
  });

  return duplicateInfo.filter((info) => info.versions.length > 1);
}

async function getTopAlbums(username: string): Promise<Album[]> {
  const pages = await getPages(username, Method.ALBUMS);
  let page = 1;
  const topAlbums: Album[] = [];

  while (typeof pages === 'number' && page < pages + 1) {
      console.log(`getting top albums for page ${page} of ${pages}`)
    const rawAlbumData = await getLastFmData(username, Method.ALBUMS, 500, page);
    if (typeof rawAlbumData === 'string') {
      console.error(rawAlbumData);
      return [];
    }
    const albumData: Album[] = rawAlbumData.topalbums.album.map((album: any) => ({
      artist: album.artist.name,
      title: album.name,
      playcount: parseInt(album.playcount),
      url: album.url,
    }));
    topAlbums.push(...albumData);
    page++;
  }
  return topAlbums;
}

async function getTopTracks(username: string): Promise<Track[]> {
  const pages = await getPages(username, Method.TRACKS);
  let page = 1;
  const topTracks: Track[] = [];

  while (typeof pages === 'number' && page < pages + 1) {
    console.log(`getting top tracks for page ${page} of ${pages}`)
    const rawTrackData = await getLastFmData(username, Method.TRACKS, 500, page);
    if (typeof rawTrackData === 'string') {
      console.error(rawTrackData);
      return [];
    }
    const trackData: Track[] = rawTrackData.toptracks.track.map((track: any) => ({
      artist: track.artist.name,
      title: track.name,
      playcount: parseInt(track.playcount),
      url: track.url,
    }));
    topTracks.push(...trackData);
    page++;
  }

  return topTracks;
}

export {
  getTopAlbums,
  getTopTracks,
  findDuplicates
};