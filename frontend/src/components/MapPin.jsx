import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const MapPin = ({ latitude, longitude, height = "120px", width = "100%" }) => {
  const [showModal, setShowModal] = useState(false);

  if (!latitude || !longitude) return null;

  const position = [Number(latitude), Number(longitude)];

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width }}>
        {/* Raw Coordinates */}
        <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
          {Number(latitude).toFixed(4)}°, {Number(longitude).toFixed(4)}°
        </span>
        
        {/* Thumbnail Map (Clickable) */}
        <div 
          onClick={() => setShowModal(true)}
          style={{ height, width, borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', cursor: 'pointer', position: 'relative' }}
        >
          {/* Overlay to catch clicks and prevent map interaction in thumbnail */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s' }}
               onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.3)'}
               onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.1)'}
          >
            <span style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: '6px 12px', borderRadius: '20px', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
              🔍 View Map
            </span>
          </div>
          
          <MapContainer 
            center={position} 
            zoom={13} 
            scrollWheelZoom={false} 
            dragging={false}
            zoomControl={false}
            doubleClickZoom={false}
            style={{ height: '100%', width: '100%' }}
            attributionControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={position} />
          </MapContainer>
        </div>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <div 
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              width: '80%', height: '80%', 
              backgroundColor: '#0f172a', 
              borderRadius: '12px', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 0 30px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, color: '#f8fafc' }}>
                Capture Location ({Number(latitude).toFixed(4)}°, {Number(longitude).toFixed(4)}°)
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ flex: 1, position: 'relative' }}>
              <MapContainer 
                center={position} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} />
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MapPin;
