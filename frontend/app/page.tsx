import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-forensic-50 to-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-forensic-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xl font-bold text-forensic-900">Forensic Recovery</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/project" className="text-forensic-600 hover:text-forensic-900 font-medium">Project</Link>
              <Link href="/scalability" className="text-forensic-600 hover:text-forensic-900 font-medium">Scalability</Link>
              <Link href="/business" className="text-forensic-600 hover:text-forensic-900 font-medium">Business</Link>
              <Link href="/login" className="bg-forensic-700 text-white px-4 py-2 rounded-lg hover:bg-forensic-800 transition-colors">Login</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-forensic-900 tracking-tight">
              Unified Digital Forensic Recovery
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-forensic-600">
              Recover deleted files and metadata from XFS and Btrfs forensic images
              with full provenance tracking, multi-engine correlation, and forensic reporting.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="bg-forensic-700 text-white px-8 py-3 rounded-lg font-medium hover:bg-forensic-800 transition-colors text-center"
              >
                Start Investigation
              </Link>
              <Link
                href="/project"
                className="border border-forensic-300 text-forensic-700 px-8 py-3 rounded-lg font-medium hover:bg-forensic-50 transition-colors text-center"
              >
                Learn How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-forensic-900 text-center mb-12">Core Capabilities</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
                title: 'XFS Recovery',
                description: 'Inode-based deleted file recovery with extent mapping, directory reconstruction, and timestamp preservation.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
                title: 'Btrfs Recovery',
                description: 'Subvolume and snapshot analysis, COW extent tracking, and object ID-based file reconstruction.',
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: 'File Carving',
                description: 'Signature-based carving for fragmented or filesystem-independent recovery with header/footer validation.',
              },
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-forensic-50 rounded-xl hover:bg-forensic-100 transition-colors">
                <div className="w-14 h-14 bg-forensic-100 rounded-lg flex items-center justify-center text-forensic-700 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-forensic-900 mb-2">{feature.title}</h3>
                <p className="text-forensic-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="py-20 bg-forensic-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-forensic-900 text-center mb-12">Unified Pipeline</h2>
          <div className="overflow-x-auto">
            <div className="flex items-center gap-4 min-w-max px-4 py-8">
              {[
                'Disk Image',
                'Evidence Intake',
                'Hash Verification',
                'FS Detection',
                'XFS Engine',
                'Btrfs Engine',
                'File Carving',
                'Meta Engine',
                'Correlation',
                'Validation',
                'Reporting',
                'Forensic UI',
              ].map((stage, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="relative w-32 h-32 bg-white rounded-xl border border-forensic-200 flex flex-col items-center justify-center p-4 text-center">
                    <span className="text-xs font-medium text-forensic-700">{stage}</span>
                  </div>
                  {i < 11 && (
                    <svg className="w-8 h-8 text-forensic-300 -ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Forensic Integrity */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-forensic-900 mb-6">Forensic Integrity First</h2>
              <ul className="space-y-4 text-forensic-600">
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-forensic-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Original evidence never modified — read-only at application level</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-forensic-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>SHA-256 verification on intake and every processing stage</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-forensic-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Complete chain of custody with timestamped audit events</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-forensic-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Provenance tracking: what, where, how, when, by which engine</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-forensic-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Confidence scoring with explicit evidence signals</span>
                </li>
              </ul>
            </div>
            <div className="bg-forensic-900 rounded-xl p-8 text-white">
              <pre className="text-xs overflow-x-auto font-mono text-forensic-200"><code>{`CASE-0001
├── EVD-0001 (disk.dd)
│   ├── SHA-256: a3f2...9e4b
│   ├── FS: XFS
│   └── Status: VERIFIED
├── JOB-0001 (Full Analysis)
│   ├── Stage: COMPLETED
│   ├── XFS Engine: SUCCESS
│   ├── Carving Engine: SUCCESS
│   └── Correlation: 3 groups
├── Artifacts: 47 recovered
│   ├── 32 filesystem (XFS)
│   ├── 15 carved (PNG, PDF, DOCX)
│   └── 3 correlated matches
└── REPORT-0001 (PDF + JSON)`}</code></pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-forensic-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Start Your Investigation?</h2>
          <p className="text-forensic-300 mb-8 max-w-2xl mx-auto">
            Deploy locally in minutes. No cloud dependencies. Full forensic integrity.
          </p>
          <Link
            href="/login"
            className="bg-white text-forensic-900 px-8 py-3 rounded-lg font-medium hover:bg-forensic-100 transition-colors inline-block"
          >
            Access Forensic Console
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-forensic-950 text-forensic-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>Forensic Recovery Platform v0.1.0 — Built for Digital Forensic Investigators</p>
        </div>
      </footer>
    </main>
  );
}