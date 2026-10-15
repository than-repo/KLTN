const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;

export function getYoutubeEmbedUrl(sourceUrl: string) {
  const parsedUrl = parseUrl(sourceUrl);

  if (!parsedUrl) {
    return null;
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, "");
  const videoId = getYoutubeVideoId(parsedUrl, hostname);

  if (!videoId || !youtubeVideoIdPattern.test(videoId)) {
    return null;
  }

  const embedUrl = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
  const startSeconds = getYoutubeStartSeconds(parsedUrl);

  if (startSeconds !== null) {
    embedUrl.searchParams.set("start", `${startSeconds}`);
  }

  return embedUrl.toString();
}

function parseUrl(sourceUrl: string) {
  try {
    return new URL(sourceUrl);
  } catch {
    return null;
  }
}

function getYoutubeVideoId(url: URL, hostname: string) {
  if (hostname === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] ?? null;
  }

  if (
    hostname !== "youtube.com" &&
    hostname !== "m.youtube.com" &&
    hostname !== "youtube-nocookie.com"
  ) {
    return null;
  }

  if (url.pathname === "/watch") {
    return url.searchParams.get("v");
  }

  const pathParts = url.pathname.split("/").filter(Boolean);

  if (pathParts[0] === "embed" || pathParts[0] === "shorts") {
    return pathParts[1] ?? null;
  }

  return null;
}

function getYoutubeStartSeconds(url: URL) {
  const startParam = url.searchParams.get("start");

  if (startParam) {
    return parseSeconds(startParam);
  }

  const timeParam = url.searchParams.get("t");

  if (!timeParam) {
    return null;
  }

  return parseSeconds(timeParam);
}

function parseSeconds(value: string) {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);

  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  return totalSeconds > 0 ? totalSeconds : null;
}
