import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/profile.css";
import { toast } from "react-toastify";

function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    contact: "",
    address: "",
  });
  const [originalProfile, setOriginalProfile] = useState({});
  const [loading, setLoading] = useState(false);

  // Load profile from Firestore
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const profileData = {
            name: data.name || "",
            email: data.email || user.email,
            contact: data.contact || "",
            address: data.address || "",
          };
          setProfile(profileData);
          setOriginalProfile(profileData);
        } else {
          const profileData = {
            name: "",
            email: user.email,
            contact: "",
            address: "",
          };
          setProfile(profileData);
          setOriginalProfile(profileData);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        toast.error("Failed to load profile. Try refreshing.");
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (
      profile.name === originalProfile.name &&
      profile.contact === originalProfile.contact &&
      profile.address === originalProfile.address
    ) {
      toast.info("No changes to save.");
      return;
    }

    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: profile.name,
          email: profile.email,
          contact: profile.contact,
          address: profile.address,
        },
        { merge: true }
      );
      toast.success("Profile saved successfully!");
      setOriginalProfile(profile); // update original
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <h1>My Profile</h1>

      <div className="profile-container">
        <div className="profile-icon">
          <div className="icon-circle">👤</div>
        </div>

        <div className="profile-form">
          <label>
            Name
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
            />
          </label>

          <label>
            Email
            <input type="email" name="email" value={profile.email} disabled />
          </label>

          <label>
            Contact
            <input
              type="text"
              name="contact"
              value={profile.contact}
              onChange={handleChange}
            />
          </label>

          <label>
            Address
            <textarea
              name="address"
              value={profile.address}
              onChange={handleChange}
            />
          </label>

          <button
            onClick={handleSave}
            disabled={loading}
            className="save-profile-btn"
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
