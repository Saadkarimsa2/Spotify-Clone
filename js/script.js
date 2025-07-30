console.log('Let’s write JavaScript');

let currentSong = new Audio();
let songs = [];
let currFolder = "";
let lastOpenedAlbumFolder = null;
let currentPlayingElement = null;
let albumSongElements = [];

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

async function loadSidebarSongs() {
    try {
        const res = await fetch('/songs/library/songs.json');
        if (!res.ok) throw new Error("Failed to load sidebar songs");

        const data = await res.json();
        const songUL = document.querySelector(".songList ul");
        songUL.innerHTML = "";

        data.songs.forEach((songObj, index) => {
            const title = songObj.songname || songObj.title || "Unknown Title";
            const url = songObj.url;

            if (!url) return;

            songUL.innerHTML += `
                <li data-index="${index}" data-url="${url}">
                    <img class="invert" width="34" src="img/music.svg" alt="">
                    <div class="info flex items-center">
                        <div>${title}</div>
                    </div>
                    <div class="playnow">
                        <span>Play Now</span>
                        <img class="play-icon" height="28" width="28" src="img/play.svg" alt="">
                    </div>
                </li>`;
        });

        document.querySelectorAll(".songList li").forEach(li => {
            li.addEventListener("click", () => {
                const songUrl = li.dataset.url;
                const icon = li.querySelector(".play-icon");

                if (currentPlayingElement && currentPlayingElement !== li) {
                    currentPlayingElement.querySelector(".play-icon").src = "img/play.svg";
                }

                if (currentSong.src.includes(songUrl)) {
                    if (currentSong.paused) {
                        currentSong.play();
                        icon.src = "img/pause.svg";
                        play.src = "img/pause.svg";
                    } else {
                        currentSong.pause();
                        icon.src = "img/play.svg";
                        play.src = "img/play.svg";
                    }
                } else {
                    playMusic(songUrl, false, li.querySelector(".info div").textContent);
                    icon.src = "img/pause.svg";
                    play.src = "img/pause.svg";
                }

                currentPlayingElement = li;
            });
        });

    } catch (err) {
        console.error("Error loading sidebar songs:", err);
    }
}

async function getSongs(folder) {
    currFolder = folder;
    let a = await fetch(`/${folder}/songs.json`);
    if (!a.ok) {
        console.error("Failed to fetch songs:", a.statusText);
        return;
    }

    let response = await a.json();
    songs = response.songs.map((item, index) => {
        if (typeof item === 'string') {
            return { title: `Track ${index + 1}`, url: item };
        } else {
            return { title: item.songname || `Track ${index + 1}`, url: item.url };
        }
    });

    console.log("Fetched songs:", songs);
    return songs;
}

function playMusic(trackUrl, pause = false, displayName = null) {
    if (currentSong.src === trackUrl && !pause) {
        currentSong.play();
        return;
    }

    currentSong.src = trackUrl;

    if (!pause) {
        currentSong.play()
            .then(() => {
                console.log("Playing:", trackUrl);
                play.src = "img/pause.svg";
            })
            .catch(err => {
                console.warn("Play prevented. Click required by browser:", err);
            });
    }

    if (!displayName) {
        const match = songs.find(s => s.url === trackUrl);
        displayName = match ? match.title : decodeURIComponent(trackUrl.split("/").pop());
    }

    document.querySelector(".songinfo").innerText = displayName;
    document.querySelector(".songtime").innerText = "00:00 / 00:00";

    document.querySelectorAll(".play-icon").forEach(icon => icon.src = "img/play.svg");

    albumSongElements.forEach(li => {
        const icon = li.querySelector(".play-icon");
        const title = li.querySelector(".info div").innerText;
        if (title === displayName && icon) {
            icon.src = "img/pause.svg";
            currentPlayingElement = li;
        }
    });
}

async function displayAlbums() {
    const cards = document.querySelectorAll(".card");

    for (let card of cards) {
        const folder = card.dataset.folder;

        try {
            const res = await fetch(`/songs/${folder}/info.json`);
            if (!res.ok) throw new Error(`Missing info.json in ${folder}`);

            const info = await res.json();

            card.innerHTML = `
                <div class="play">
                    <svg class="album-play" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
                    </svg>
                </div>
                <img src="/songs/${folder}/cover.jpg" alt="cover">
                <h3>${info.title}</h3>
                <p>${info.description}</p>
            `;

            const playSvg = card.querySelector(".album-play");
            playSvg.addEventListener("click", async (e) => {
                e.stopPropagation();
                const songList = await getSongs(`songs/${folder}`);
                if (songList.length > 0) {
                    const albumSongList = document.querySelector(".albumSongList");
                    albumSongList.innerHTML = `<h2 style='font-weight:bold;'>${info.title}</h2>`;
                    songs = songList;
                    albumSongList.style.display = "block";

                    albumSongList.innerHTML += songList.map(songObj => {
                        return `<li>
                            <div class="info flex items-center">
                                <div>${songObj.title}</div>
                            </div>
                            <div class="playnow">
                                <span>Play Now</span>
                                <img class="play-icon" height="28" width="28" src="img/play.svg" alt="">
                            </div>
                        </li>`;
                    }).join("");

                    const listItems = albumSongList.querySelectorAll("li");
                    albumSongElements = Array.from(listItems);
                    listItems.forEach((li, i) => {
                        li.addEventListener("click", () => handleSongClick(songList[i], li));
                    });

                    const firstLi = albumSongList.querySelector("li");
                    if (firstLi) {
                        currentPlayingElement = firstLi;
                        playMusic(songList[0].url, false, songList[0].title);
                    }
                }
            });

            card.addEventListener("click", async () => {
                lastOpenedAlbumFolder = folder;
                document.querySelector(".cardContainer").style.display = "none";
                const albumSongList = document.querySelector(".albumSongList");
                albumSongList.innerHTML = `<h2 style='font-weight:bold;'>${info.title}</h2>`;

                songs = await getSongs(`songs/${folder}`);

                if (songs && songs.length > 0) {
                    albumSongList.innerHTML += songs.map(songObj => {
                        return `<li>
                            <div class="info flex items-center">
                                <div>${songObj.title}</div>
                            </div>
                            <div class="playnow">
                                <span>Play Now</span>
                                <img class="play-icon" height="28" width="28" src="img/play.svg" alt="">
                            </div>
                        </li>`;
                    }).join("");

                    const listItems = albumSongList.querySelectorAll("li");
                    albumSongElements = Array.from(listItems);
                    listItems.forEach((li, i) => {
                        li.addEventListener("click", () => handleSongClick(songs[i], li));
                    });

                    albumSongList.style.display = "block";
                }
            });

        } catch (err) {
            console.warn(err.message);
        }
    }
}

function handleSongClick(songObj, li) {
    const icon = li.querySelector(".play-icon");

    if (currentPlayingElement && currentPlayingElement !== li) {
        currentPlayingElement.querySelector(".play-icon").src = "img/play.svg";
    }

    if (currentSong.src.includes(songObj.url)) {
        if (currentSong.paused) {
            currentSong.play();
            icon.src = "img/pause.svg";
            play.src = "img/pause.svg";
        } else {
            currentSong.pause();
            icon.src = "img/play.svg";
            play.src = "img/play.svg";
        }
    } else {
        currentPlayingElement = li;
        playMusic(songObj.url, false, songObj.title);
        icon.src = "img/pause.svg";
        play.src = "img/pause.svg";
    }
}

async function main() {
    await loadSidebarSongs();
    await displayAlbums();

    songs = await getSongs("songs/ncs");
    if (songs && songs.length > 0) {
        playMusic(songs[0].url, true);
    }

    document.getElementById("play").addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "img/pause.svg";

            document.querySelectorAll(".songList li").forEach(li => {
                const songUrl = li.dataset.url;
                const icon = li.querySelector(".play-icon");
                if (currentSong.src.includes(songUrl)) {
                    icon.src = "img/pause.svg";
                } else {
                    icon.src = "img/play.svg";
                }
            });

        } else {
            currentSong.pause();
            play.src = "img/play.svg";

            document.querySelectorAll(".songList li").forEach(li => {
                const songUrl = li.dataset.url;
                const icon = li.querySelector(".play-icon");
                if (currentSong.src.includes(songUrl)) {
                    icon.src = "img/play.svg";
                }
            });
        }
    });

    document.querySelectorAll(".hamburgerContainer svg")[0].addEventListener("click", () => {
        document.querySelector(".cardContainer").style.display = "flex";
        document.querySelector(".albumSongList").style.display = "none";
    });

    document.querySelectorAll(".hamburgerContainer svg")[1].addEventListener("click", async () => {
        if (lastOpenedAlbumFolder) {
            document.querySelector(".cardContainer").style.display = "none";
            const albumSongList = document.querySelector(".albumSongList");
            albumSongList.innerHTML = "";

            songs = await getSongs(`songs/${lastOpenedAlbumFolder}`);

            if (songs && songs.length > 0) {
                songs.forEach((songObj, index) => {
                    const li = document.createElement("li");
                    li.innerHTML = `
                        <div class="info flex items-center">
                            <div>${songObj.title}</div>
                        </div>
                        <div class="playnow">
                            <span>Play Now</span>
                            <img class="play-icon" height="28" width="28" src="img/play.svg" alt="">
                        </div>`;

                    li.addEventListener("click", () => {
                        document.querySelectorAll(".albumSongList li .play-icon").forEach(img => img.src = "img/play.svg");
                        li.querySelector(".play-icon").src = "img/pause.svg";
                        playMusic(songObj.url);
                    });

                    albumSongList.appendChild(li);
                });

                albumSongList.style.display = "block";
            }
        }
    });

    currentSong.addEventListener("timeupdate", () => {
        if (!isNaN(currentSong.duration)) {
            const percent = (currentSong.currentTime / currentSong.duration) * 100;
            document.querySelector(".songtime").innerText =
                `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
            document.querySelector(".circle").style.left = `${percent}%`;
            document.querySelector(".seekbar").style.background = `linear-gradient(to right, rgba(124, 77, 182) ${percent}%, white ${percent}%)`;
        }
    });

    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width);
        currentSong.currentTime = currentSong.duration * percent;
        document.querySelector(".circle").style.left = `${percent * 100}%`;
    });

    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    document.getElementById("previous").addEventListener("click", () => {
        let index = songs.findIndex(song => song.url === currentSong.src);
        if (index > 0) playMusic(songs[index - 1].url);
    });

    document.getElementById("next").addEventListener("click", () => {
        let index = songs.findIndex(song => song.url === currentSong.src);
        if (index + 1 < songs.length) playMusic(songs[index + 1].url);
    });

    document.querySelector(".range input").addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100;
        const volumeIcon = document.querySelector(".volume > img");
        if (currentSong.volume > 0) {
            volumeIcon.src = "img/volume.svg";
        } else {
            volumeIcon.src = "img/mute.svg";
        }
    });

    document.querySelector(".volume > img").addEventListener("click", e => {
        const input = document.querySelector(".range input");
        if (e.target.src.includes("volume.svg")) {
            e.target.src = "img/mute.svg";
            currentSong.volume = 0;
            input.value = 0;
        } else {
            e.target.src = "img/volume.svg";
            currentSong.volume = 0.1;
            input.value = 10;
        }
    });
}

main();
