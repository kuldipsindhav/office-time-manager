import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, User, Loader2, AlertTriangle } from 'lucide-react';
import { nfcService } from '../../services';

const NfcPunchPage = () => {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, punching, success, error, closing, duplicate
  const [userData, setUserData] = useState(null);
  const [punchData, setPunchData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  // Check for duplicate punch and auto-punch
  useEffect(() => {
    checkAndPunch();
  }, [uid]);

  // Auto-close countdown after success
  useEffect(() => {
    if (status === 'closing' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (status === 'closing' && countdown === 0) {
      // Redirect to login page
      navigate('/login');
    }
  }, [status, countdown, navigate]);

  const checkAndPunch = async () => {
    // Check if this NFC was punched recently (within 60 seconds)
    const lastPunchKey = `nfc_punch_${uid}`;
    const lastPunchTime = localStorage.getItem(lastPunchKey);
    
    if (lastPunchTime) {
      const timeDiff = Date.now() - parseInt(lastPunchTime);
      if (timeDiff < 60000) { // 60 seconds
        const remainingSeconds = Math.ceil((60000 - timeDiff) / 1000);
        setErrorMessage(`Already punched! Please wait ${remainingSeconds} seconds before next punch.`);
        setStatus('duplicate');
        return;
      }
    }

    // Proceed with punch
    try {
      setStatus('punching');
      const response = await nfcService.quickPunch(uid);
      setPunchData(response.data);
      
      // Save punch time to prevent duplicates
      localStorage.setItem(lastPunchKey, Date.now().toString());
      
      setStatus('success');
      
      // Start closing countdown after 2 seconds
      setTimeout(() => {
        setStatus('closing');
      }, 2000);
    } catch (error) {
      const message = error.response?.data?.message || 'Punch failed';
      setErrorMessage(message);
      
      // If backend says double punch, save the time anyway
      if (message.includes('Double punch') || message.includes('wait')) {
        localStorage.setItem(lastPunchKey, Date.now().toString());
        setStatus('duplicate');
      } else {
        setStatus('error');
      }
    }
  };

  // Punching State
  if (status === 'loading' || status === 'punching') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
          <h2 className="text-xl font-semibold text-gray-800 mt-4">Recording Punch...</h2>
          <p className="text-gray-500 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  // Success State
  if (status === 'success' || status === 'closing') {
    const isIN = punchData?.punch?.type === 'IN';
    
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${
        isIN ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-orange-500 to-red-500'
      }`}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
            isIN ? 'bg-green-100' : 'bg-orange-100'
          }`}>
            <CheckCircle className={`w-12 h-12 ${isIN ? 'text-green-600' : 'text-orange-600'}`} />
          </div>
          
          <h2 className={`text-3xl font-bold mt-4 ${isIN ? 'text-green-600' : 'text-orange-600'}`}>
            Punch {punchData?.punch?.type}
          </h2>
          
          <p className="text-xl font-semibold text-gray-800 mt-2">
            {punchData?.user?.name}
          </p>
          
          <div className="mt-4 flex items-center justify-center gap-2 text-gray-600">
            <Clock className="w-5 h-5" />
            <span className="text-lg font-medium">{punchData?.punch?.timeLocal}</span>
          </div>

          {status === 'closing' && (
            <div className="mt-6 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-500">
                Redirecting in <span className="font-bold text-gray-700">{countdown}</span> seconds...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-red-600 mt-4">Punch Failed</h2>
          
          <p className="text-gray-600 mt-2">{errorMessage}</p>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full mt-6 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Duplicate Punch State
  if (status === 'duplicate') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-12 h-12 text-yellow-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-yellow-600 mt-4">Already Punched!</h2>
          
          <p className="text-gray-600 mt-2">{errorMessage}</p>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full mt-6 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default NfcPunchPage;
