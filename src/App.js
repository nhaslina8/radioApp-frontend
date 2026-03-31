import React, { useState, useEffect } from "react";
import axios from "axios";
import ReactPlayer from "react-player";
import "./App.css"; // Import CSS file for styling
import Hls from "hls.js";

function App() {
  const [streaming, setStreaming] = useState(false);
  const [playlistURL, setPlaylistURL] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [musicList, setMusicList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [duration, setDuration] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [uploadStatus, setUploadStatus] = useState(""); 
  const [filename, setFilename] = useState("");
  const [time, setTime] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [playlist, setPlaylist] = useState(null);

  useEffect(() => {
    fetchMusicList();
    fetchSchedule();

    // WebSocket Connection
    const socket = new WebSocket("ws://localhost:5001");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WebSocket Message:", data);

      if (data.status === "uploading") {
        setUploadStatus(`Uploading: ${data.file}...`);
      } else if (data.status === "processing") {
        setUploadStatus(`Processing: ${data.progress}%`);
        setProgress(data.progress);
      } else if (data.status === "done") {
        setUploadStatus("Streaming started!");
        setPlaylistURL(data.playlist);
        setStreaming(true);
        fetchMusicList();
      }

      if (data.event === "new_stream") {
        console.log("🎶 New stream available:", data.file);
        const newPlaylist = `/public/${data.file}.m3u8?t=${Date.now()}`;
        setPlaylist(newPlaylist);
        reloadPlayer(newPlaylist);
      }
    };

    return () => socket.close();
  }, []);

  const fetchMusicList = async () => {
    try {
      const response = await axios.get("http://localhost:5000/list");
      setMusicList(response.data);
      if (response.data.length > 0) {
        setFilename(response.data[0].name);
      }
    } catch (error) {
      console.error("Error fetching music list:", error);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await fetch("http://localhost:5000/schedule");
      const data = await res.json();
      setSchedule(data);
    } catch (error) {
      console.error("Error fetching schedule:", error);
    }
  };

  const handleFileChange = (event) => {
    setAudioFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!audioFile) {
      alert("Please select an audio file");
      return;
    }

    const formData = new FormData();
    formData.append("audio", audioFile);

    try {
      const response = await axios.post("http://localhost:5000/upload", formData);
      alert("Audio uploaded successfully!");
      setStreaming(true);
      setPlaylistURL(response.data.playlist);
      fetchMusicList();
    } catch (error) {
      console.error("Error uploading audio:", error);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await axios.delete(`http://localhost:5000/delete/${filename}`);
      alert(`${filename} deleted successfully!`);
      fetchMusicList();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Error deleting file");
    }
  };

  const addSchedule = async () => {
    try {
      const response = await fetch("http://localhost:5000/addSchedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ filename, scheduled_time: time }) 
      });
  
      const data = await response.json();
      console.log("Response:", data);
  
      if (response.ok) {
        alert("Schedule added successfully!");
        setFilename("");
        setTime("");
        fetchSchedule();
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      console.error("Error adding schedule:", error);
      alert("Failed to add schedule. Check console for details.");
    }
  };

  const reloadPlayer = (playlistUrl) => {
    const video = document.getElementById("radioPlayer");
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(playlistUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playlistUrl;
    }
  };

  return (
    <div className="container">
      <h2>Live Audio Streaming 🎵</h2>

      <div className="main-layout">
        <div className="section">
          <h3>Upload & Stream</h3>
          <input type="file" accept="audio/*" onChange={handleFileChange} />
          <button className="upload-btn" onClick={handleUpload}>Upload & Stream</button>
          {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
          {progress > 0 && <progress value={progress} max="100"></progress>}
        </div>

        <div className="section">
          <h3>Available Music:</h3>
          <ul className="music-list">
            {musicList.map((music, index) => (
              <li key={index}>
                <button className="play-btn" onClick={() => { setStreaming(true); setPlaylistURL(music.url); setCurrentIndex(index); }}>
                  {music.name}
                </button>
                <button className="delete-btn" onClick={() => handleDelete(music.name)}>❌</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="main-layout">
        <div className="section">
          <h2>📅 Scheduled Music</h2>
          <div className="scheduler-controls">
            <select onChange={(e) => setFilename(e.target.value)} value={filename}>
              <option value="">Select Music</option>
              {musicList.map((music) => (
                <option key={music.name} value={music.name}>
                  {music.name}
                </option>
              ))}
            </select>
            <input type="datetime-local" onChange={(e) => setTime(e.target.value)} value={time} />
            <button onClick={addSchedule}>Schedule</button>
          </div>
          <ul>
            {schedule.map((item) => (
              <li key={item.id}>
                {item.filename} - {new Date(item.scheduled_time).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>

        <div className="section">
          <h2>🎵 Now Playing</h2>
          {playlist ? (
            <video id="radioPlayer" controls autoPlay style={{ width: "100%" }} />
          ) : (
            <p>Waiting for scheduled music...</p>
          )}
          
          {streaming && playlistURL && (
            <div className="player-container">
              <ReactPlayer
                url={`http://localhost:5000${playlistURL}`}
                playing={isPlaying}
                controls={false}
                width="100%"
                height="50px"
                volume={volume}
                onProgress={({ played }) => setProgress(played * 100)}
                onDuration={setDuration}
              />
              <input type="range" min="0" max="100" value={progress} readOnly className="seek-bar" />
              <label>Volume:</label>
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="volume-slider" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;