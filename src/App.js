import React, { useState } from "react";
import axios from "axios";
import ReactPlayer from 'react-player';

function App() {
  const [streaming, setStreaming] = useState(false);
  const [playlistURL, setPlaylistURL] = useState(""); // Store the streaming URL
  const [audioFile, setAudioFile] = useState(null);

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

      // Update streaming state
      setStreaming(true);
      setPlaylistURL(response.data.playlist); // Use the dynamic URL from the server
    } catch (error) {
      console.error("Error uploading audio:", error);
    }
  };

  return (
    <div>
      <h2>Live Audio Streaming</h2>
      <input type="file" accept="audio/*" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload & Stream</button>

      {streaming && playlistURL && (
        <ReactPlayer 
          url={`http://localhost:5000${playlistURL}`} // Use dynamic playlist URL
          playing
          controls
          width="100%"
          height="50px"
        />
      )}
    </div>
  );
}

export default App;
