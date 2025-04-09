import React, { useState, useRef, useEffect } from 'react';
import { Camera, Video, X, Image } from 'lucide-react';


const CameraApp = () => {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [mediaDevices, setMediaDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [storedMedia, setStoredMedia] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [mode, setMode] = useState('photo'); // 'photo' or 'video'
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Load stored media from localStorage on component mount
  useEffect(() => {
    const loadStoredMedia = () => {
      try {
        const savedMedia = localStorage.getItem('capturedMedia');
        if (savedMedia) {
          setStoredMedia(JSON.parse(savedMedia));
        }
      } catch (error) {
        console.error('Error loading media from localStorage:', error);
      }
    };

    loadStoredMedia();
  }, []);

  // Save media to localStorage whenever storedMedia changes
  useEffect(() => {
    localStorage.setItem('capturedMedia', JSON.stringify(storedMedia));
  }, [storedMedia]);

  // Get available camera devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setMediaDevices(videoDevices);
        
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error('Error enumerating devices:', error);
      }
    };

    getDevices();
  }, []);

  // Start camera when device is selected or camera is activated
  useEffect(() => {
    if (cameraActive && selectedDeviceId) {
      startCamera();
    } else if (!cameraActive && stream) {
      stopCamera();
    }

    return () => {
      if (stream) {
        stopCamera();
      }
    };
  }, [cameraActive, selectedDeviceId]);

  const startCamera = async () => {
    try {
      if (stream) {
        stopCamera();
      }

      const constraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined
        },
        audio: mode === 'video'
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const toggleCamera = () => {
    setCameraActive(!cameraActive);
  };

  const switchCamera = (deviceId) => {
    setSelectedDeviceId(deviceId);
    if (cameraActive) {
      startCamera();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !stream) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/png');
    const newMedia = {
      id: Date.now(),
      type: 'image',
      data: imageData,
      timestamp: new Date().toLocaleString()
    };
    
    setStoredMedia([newMedia, ...storedMedia]);
  };

  const startRecording = () => {
    if (!videoRef.current || !stream) return;
    
    setRecordedChunks([]);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks(prev => [...prev, event.data]);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      const newMedia = {
        id: Date.now(),
        type: 'video',
        data: url,
        timestamp: new Date().toLocaleString()
      };
      
      setStoredMedia([newMedia, ...storedMedia]);
      setRecordedChunks([]);
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'photo' ? 'video' : 'photo');
    if (isRecording) {
      stopRecording();
    }
  };

  const deleteMedia = (id) => {
    const updatedMedia = storedMedia.filter(media => media.id !== id);
    setStoredMedia(updatedMedia);
    
    if (selectedMedia && selectedMedia.id === id) {
      setSelectedMedia(null);
    }
  };

  const handleCapture = () => {
    if (mode === 'photo') {
      capturePhoto();
    } else {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    }
  };

  return (
    <div className="camera-app">
      <div className="camera-section">
        <div className="camera-container">
          {cameraActive ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="camera-preview"
            />
          ) : (
            <div className="camera-placeholder">
              <Camera size={48} />
              <p>Camera is off</p>
            </div>
          )}
        </div>
        
        <div className="camera-controls">
          <button 
            className={`control-btn ${cameraActive ? 'active' : ''}`} 
            onClick={toggleCamera}
          >
            {cameraActive ? 'Turn Off Camera' : 'Turn On Camera'}
          </button>
          
          {cameraActive && (
            <>
              <button 
                className={`control-btn ${mode === 'photo' ? 'active' : ''}`}
                onClick={toggleMode}
              >
                {mode === 'photo' ? <Camera size={20} /> : <Video size={20} />}
                <span>{mode === 'photo' ? 'Photo Mode' : 'Video Mode'}</span>
              </button>
              
              <button 
                className={`capture-btn ${isRecording ? 'recording' : ''}`}
                onClick={handleCapture}
                disabled={!cameraActive}
              >
                {mode === 'photo' ? 
                  'Capture Photo' : 
                  (isRecording ? 'Stop Recording' : 'Start Recording')
                }
              </button>
              
              {mediaDevices.length > 1 && (
                <select 
                  value={selectedDeviceId}
                  onChange={(e) => switchCamera(e.target.value)}
                  className="device-selector"
                >
                  {mediaDevices.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${mediaDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="gallery-section">
        <h2>Captured Media</h2>
        
        <div className="media-grid">
          {storedMedia.length === 0 ? (
            <p className="no-media">No media captured yet</p>
          ) : (
            storedMedia.map(media => (
              <div 
                key={media.id} 
                className={`media-item ${selectedMedia && selectedMedia.id === media.id ? 'selected' : ''}`}
                onClick={() => setSelectedMedia(media)}
              >
                {media.type === 'image' ? (
                  <img src={media.data} alt="Captured" />
                ) : (
                  <div className="video-thumbnail">
                    <Video size={24} />
                  </div>
                )}
                <div className="media-overlay">
                  <span className="media-timestamp">{media.timestamp}</span>
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMedia(media.id);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {selectedMedia && (
          <div className="media-preview">
            <button 
              className="close-preview"
              onClick={() => setSelectedMedia(null)}
            >
              <X size={24} />
            </button>
            
            {selectedMedia.type === 'image' ? (
              <img 
                src={selectedMedia.data} 
                alt="Selected media" 
                className="preview-content"
              />
            ) : (
              <video 
                src={selectedMedia.data} 
                controls 
                className="preview-content"
              />
            )}
            
            <div className="preview-info">
              <p>
                <span>{selectedMedia.type === 'image' ? <Image size={16} /> : <Video size={16} />}</span>
                <span>{selectedMedia.timestamp}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraApp;