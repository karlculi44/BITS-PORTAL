import { useState } from "react";
import { CircleUserRound } from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import bitsLogo from "../assets/images/bits-trimmed.png";
import Logo from "./Logo";
import { getServiceImageUrl } from "../services/serviceService";

function ProfileImage({ user }) {
  const [failedImage, setFailedImage] = useState("");
  const image = user.profile_image ? getServiceImageUrl(user.profile_image) : "";

  return image && image !== failedImage ? (
    <img
      src={image}
      alt=""
      onError={() => setFailedImage(image)}
      className="public-profile-image"
    />
  ) : (
    <CircleUserRound size={22} aria-hidden="true" />
  );
}

function PublicHeader() {
  const { user, loading } = useAuth();
  const navClass = ({ isActive }) =>
    `public-nav-link${isActive ? " active" : ""}`;

  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Link to="/" className="public-brand" aria-label="BITS Portal home">
          <Logo src={bitsLogo} alt="" className="public-brand-logo" />
          <span className="public-brand-copy"><strong>BITS Portal</strong></span>
        </Link>
        <nav className="public-nav" aria-label="Primary navigation">
          <NavLink to="/" end className={navClass}>Home</NavLink>
          <NavLink to="/about" className={navClass}>About</NavLink>
          <NavLink to="/policy-library" className={navClass}>Policies</NavLink>
          <a
            href="http://bitsportal/orgstructure/"
            className="public-nav-link"
            target="_blank"
            rel="noreferrer"
          >
            BITS Organization
          </a>
        </nav>
        <div className="public-header-actions">
          {!loading &&
            (user ? (
              <Link
                to="/dashboard"
                className="public-profile-link"
                aria-label="Go to dashboard"
                title="Go to dashboard"
              >
                <ProfileImage user={user} />
              </Link>
            ) : (
              <Link to="/login" className="public-nav-link public-login-link">Login</Link>
            ))}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default PublicHeader;
