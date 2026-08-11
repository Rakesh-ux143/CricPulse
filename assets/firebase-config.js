// 1. Go to https://console.firebase.google.com -> Create project (free)
// 2. Build > Realtime Database -> Create Database -> Start in TEST MODE for now
// 3. Project settings (gear icon) > General > Your apps > Web app (</>) > copy the config below
// 4. Paste your own values here. This file is safe to commit to a PUBLIC GitHub repo
//    as long as you set proper Realtime Database security rules (see README.md).

const firebaseConfig = {
  apiKey: "AIzaSyDcrdmFMTKfZPfc9ghK0Hwxr6DCQ3ih3h0",
  authDomain: "cricpulse-72c4f.firebaseapp.com",
  databaseURL: "https://cricpulse-72c4f-default-rtdb.firebaseio.com",
  projectId: "cricpulse-72c4f",
  storageBucket: "cricpulse-72c4f.firebasestorage.app",
  messagingSenderId: "31225134918",
  appId: "1:31225134918:web:3c6307bfbaf2faf3f92f47",
  measurementId: "G-MZC6M9M8SS"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();
