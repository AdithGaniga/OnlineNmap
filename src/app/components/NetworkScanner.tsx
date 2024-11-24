"use client"
import React, { useState, useEffect } from 'react';
import { Loader2, Server, Shield, Network, Scan } from 'lucide-react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, speed = 50 }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <span className="border-r-2 border-gray-500 pr-1 animate-pulse">
      {displayText}
    </span>
  );
};

// Rest of the NetworkScanner component remains the same...
const NetworkScanner = () => {
  const [target, setTarget] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);
  const [error, setError] = useState('');

  // Previous code remains the same...
  const validateTarget = (ip: string) => {
    return ip.length > 0 && !ip.includes(';') && !ip.includes('&');
  };

  const handleScan = async (scanType: string) => {
    if (!validateTarget(target)) {
      setError('Please enter a valid target IP or hostname');
      return;
    }

    setScanning(true);
    setError('');
    setScanResults(null);

    try {
      const response = await fetch('http://localhost:5000/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target,
          scan_type: scanType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setScanResults(data);
      } else {
        setError(data.error || 'Scan failed');
      }
    } catch (err) {
      setError('Failed to connect to scanning service');
    } finally {
      setScanning(false);
    }
  };

  const renderVulnerabilities = (vulnerabilities: string[]) => {
    if (!vulnerabilities || vulnerabilities.length === 0) return null;
    
    return (
      <div className="mt-4">
        <h4 className="text-lg font-semibold text-red-600 mb-2 flex items-center">
          <Shield className="mr-2" /> Vulnerabilities
        </h4>
        <ul className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg shadow-sm">
          {vulnerabilities.map((vuln, index) => (
            <li key={index} className="text-red-800 mb-2 flex items-start">
              <span className="mr-2">•</span> {vuln}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderHostDetails = () => {
    if (!scanResults || !scanResults.hosts) return null;

    return scanResults.hosts.map((host:any, index:number) => (
      <div key={index} className="mb-6 bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg p-6 border border-blue-100">
        <h3 className="text-xl font-bold mb-3 text-blue-800 flex items-center">
          <Network className="mr-2" /> Host: {host.ip}
        </h3>
        <p className="mb-2 text-blue-700">State: {host.state}</p>

        {host.protocols && host.protocols.map((proto:any, protoIndex:number) => (
          <div key={protoIndex} className="mt-4">
            <h4 className="font-semibold text-blue-700">Protocol: {proto.name}</h4>
            {proto.ports.map((port:any, portIndex:number) => (
              <div 
                key={portIndex} 
                className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg mt-2 shadow-sm"
              >
                <span className="font-medium text-blue-800">Port {port.port}</span>
                <span className="ml-2 text-blue-600">
                  State: {port.state}
                  {port.service && ` | Service: ${port.service}`}
                  {port.version && ` (${port.version})`}
                </span>
              </div>
            ))}
          </div>
        ))}

        {host.os_detection && (
          <div className="mt-4">
            <h4 className="font-semibold text-blue-700 flex items-center">
              <Server className="mr-2" /> OS Detection
            </h4>
            {host.os_detection.map((os:any, osIndex:number) => (
              <div 
                key={osIndex} 
                className="bg-gradient-to-r from-blue-100 to-blue-200 p-3 rounded-lg mt-2 shadow-sm"
              >
                {os.name} (Accuracy: {os.accuracy}%)
              </div>
            ))}
          </div>
        )}

        {renderVulnerabilities(host.vulnerabilities)}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-white p-8">
      <div className="bg-white bg-opacity-90 rounded-2xl shadow-2xl p-8 backdrop-blur-sm max-w-4xl mx-auto border border-blue-200">
        <div className="mb-6">
          <div className="flex items-center justify-center mb-4 space-x-3">
            <Scan className="w-10 h-10 text-blue-900 animate-pulse" />
            <h2 className="text-4xl font-bold text-blue-950">Network Scanner</h2>
          </div>

          <div className="text-xl font-light italic text-gray-500 text-center mb-8">
            <p>
              <TypewriterText 
                text="Check if your system has any open attack surface, before any attacker does it." 
                speed={50}
              />
            </p>
          </div>
          
          <input
            type="text"
            placeholder="Enter target IP or hostname"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full p-3 mb-6 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-950 bg-blue-50 placeholder-blue-900"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {['Fast Scan', 'Version Scan', 'Full Scan', 'OS Scan', 'Exploits'].map((scanType) => (
              <button
                key={scanType}
                onClick={() => handleScan(scanType.split(' ')[0].toLowerCase())}
                disabled={scanning}
                className={`
                  p-2 rounded-lg font-medium text-sm
                  ${scanning
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-black to-blue-950 hover:from-blue-800 hover:to-blue-950 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200'}
                  w-full md:w-auto
                `}
              >
                {scanning && <Loader2 className="inline mr-1 h-4 w-4 animate-spin" />}
                {scanType}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-gradient-to-r from-red-100 to-red-200 border border-red-300 text-red-700 rounded-lg shadow-sm">
              {error}
            </div>
          )}

          {scanResults && renderHostDetails()}
        </div>
      </div>
    </div>
  );
};

export default NetworkScanner;