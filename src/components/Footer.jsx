import { Link } from 'react-router-dom'

export default function Footer() {
  const cities = [
    ['Oklahoma City', '/oklahoma-city'],
    ['Tulsa', '/tulsa'],
    ['Norman', '/norman'],
    ['Lawton', '/lawton'],
    ['Edmond', '/edmond'],
    ['Broken Arrow', '/broken-arrow'],
    ['Midwest City', '/midwest-city'],
  ]

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <p className="footer-logo">🚛 FindDOTPhysical.com</p>
          <p className="footer-tagline">Oklahoma's CDL Medical Exam Directory</p>
        </div>

        <div className="footer-cities">
          <p className="footer-heading">Cities</p>
          {cities.map(([label, href]) => (
            <Link key={href} to={href} className="footer-link">{label}</Link>
          ))}
        </div>

        <div className="footer-links">
          <p className="footer-heading">Examiners</p>
          <Link to="/get-listed" className="footer-link">Get Listed Free</Link>
        </div>
      </div>

      <p className="footer-copy">
        © {new Date().getFullYear()} FindDOTPhysical.com · Not affiliated with the FMCSA
      </p>
    </footer>
  )
}
