import { ArrowDown, Compass, Eye, Layers3, Target } from "lucide-react";
import informationTechnologyLogo from "../assets/images/ITS_logo.png";
import "./AboutPage.css";

const objectives = [
  "Respond promptly and efficiently to all calls for assistance, reducing end-user waiting time by a significant number of minutes.",
  "Provide an automated system that conforms to the concepts of transparency, rule of law, fairness, and participation within the timeframe.",
];

const strategies = [
  "Collect accurate and credible data.",
  "Complete data build-up efficiently and provide feedback.",
  "Resolve issues and concerns professionally, courteously, and with an open mind.",
  "Develop innovative strategies and out-of-the-box techniques for timely and reliable access to information.",
  "Manage and sort collected data with integrity for responsible problem-solving and decision-making.",
  "Continuously build capacity through relevant training courses and seminars.",
  "Formulate the five-year ISSP.",
  "Create an ICT Council for ICT-related projects.",
  "Pursue the construction of the BIT Hub to bring the office's divisions together in one location.",
];

const tactics = [
  "Build accurate data into the database.",
  "Provide technical assistance to reduce and ease users' workloads.",
  "Study and analyze problems and define computing requirements to provide appropriate solutions.",
  "Adopt ever-improving technology to improve efficiency and productivity through automation.",
  "Prioritize systems development and implementation.",
  "Increase manpower and provide skills enhancement interventions.",
  "Proactively allocate investment during budgeting.",
  "Conduct regular technology talks with Network, Hardware, and Admin.",
];

function NumberedList({ items, className = "" }) {
  return (
    <ol className={`about-list ${className}`}>
      {items.map((item, index) => (
        <li key={item}>
          <span className="about-list-number" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function AboutPage() {
  return (
    <div className="public-portal">
      <main className="about-page">
        <div className="about-content">
          <section className="about-intro" aria-labelledby="about-heading">
            <div className="about-intro-copy">
              <p className="about-kicker">Bayawan Information Technology Section</p>
              <h1 id="about-heading">About BITS</h1>
              <p>
                Supporting digital services and technology initiatives for
                Bayawan City through the work of its Information Technology Section.
              </p>
            </div>
            <div className="about-logo">
              <img src={informationTechnologyLogo} alt="Information Technology Section logo" />
            </div>
          </section>

          <div className="about-purpose">
            <section className="about-feature about-feature-vision" aria-labelledby="vision-heading">
              <span className="about-feature-icon"><Eye size={23} aria-hidden="true" /></span>
              <div>
                <p className="about-feature-label">Our direction</p>
                <h2 id="vision-heading">Vision</h2>
                <p className="about-feature-statement">
                  A catalyst of good governance through Information Technology.
                </p>
              </div>
            </section>
            <section className="about-feature about-feature-mission" aria-labelledby="mission-heading">
              <span className="about-feature-icon"><Target size={23} aria-hidden="true" /></span>
              <div>
                <p className="about-feature-label">Our commitment</p>
                <h2 id="mission-heading">Mission</h2>
                <p className="about-feature-statement">
                  To expand connectivity within the next three years to deliver accessible streamlined services.
                </p>
              </div>
            </section>
          </div>

          <div className="about-connector" aria-hidden="true">
            <span /> <ArrowDown size={16} /> <span />
          </div>

          <section className="about-objectives" aria-labelledby="objectives-heading">
            <div className="about-section-heading">
              <span className="about-section-icon"><Target size={20} aria-hidden="true" /></span>
              <div>
                <p className="about-kicker">What we aim to achieve</p>
                <h2 id="objectives-heading">Objectives</h2>
              </div>
            </div>
            <NumberedList items={objectives} className="about-objective-list" />
          </section>

          <div className="about-direction">
            <section className="about-panel" aria-labelledby="strategy-heading">
              <div className="about-section-heading">
                <span className="about-section-icon"><Compass size={20} aria-hidden="true" /></span>
                <div>
                  <p className="about-kicker">How we move forward</p>
                  <h2 id="strategy-heading">Strategy</h2>
                </div>
              </div>
              <NumberedList items={strategies} />
            </section>
            <section className="about-panel about-tactics" aria-labelledby="tactics-heading">
              <div className="about-section-heading">
                <span className="about-section-icon"><Layers3 size={20} aria-hidden="true" /></span>
                <div>
                  <p className="about-kicker">Putting direction into action</p>
                  <h2 id="tactics-heading">Tactics</h2>
                </div>
              </div>
              <NumberedList items={tactics} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AboutPage;
