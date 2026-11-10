import { MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import bayawanCityLogo from "../assets/images/bayawan_city_logo-trimmed.png";
import bitsLogo from "../assets/images/bits-trimmed.png";
import informationTechnologyLogo from "../assets/images/ITS_logo.png";
import Logo from "./Logo";

function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <section className="public-footer-brand" aria-labelledby="footer-brand">
          <h2 className="public-footer-heading" id="footer-brand">
            BITS Portal
          </h2>
          <div className="public-footer-logos" aria-label="Organization logos">
            <Link to="/" aria-label="BITS Portal home">
              <Logo className="public-footer-logo" src={bitsLogo} alt="BITS Portal" />
            </Link>
            <Logo className="public-footer-logo" src={bayawanCityLogo} alt="Bayawan City seal" />
            <Logo className="public-footer-logo" src={informationTechnologyLogo} alt="Information Technology Section" />
          </div>
          <p className="public-footer-tagline">
            Bayawan City&apos;s digital services, connected in one place.
          </p>
        </section>

        <section className="public-footer-meta" aria-labelledby="footer-info">
          <h2 className="public-footer-heading" id="footer-info">
            Portal information
          </h2>
          <p>© {currentYear} BITS Portal. All rights reserved.</p>
          <p className="public-footer-developer">
            Developed by{" "}
            <a
              href="https://mbmyportfolio.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              MPB
            </a>{" "}
            •{" "}
            <a
              href="https://karl-culi-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
            >
              KZC
            </a>
          </p>
        </section>

        <section className="public-footer-connect" aria-labelledby="footer-connect">
          <h2 className="public-footer-heading" id="footer-connect">
            Stay connected
          </h2>
          <div className="public-footer-contact-note">
            <span className="public-footer-contact-icon" aria-hidden="true">
              <MessageCircle size={19} />
            </span>
            <p>Official contact and social links will appear here when available.</p>
          </div>
        </section>
      </div>
    </footer>
  );
}

export default PublicFooter;
