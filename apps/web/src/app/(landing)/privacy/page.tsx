import Link from "next/link";
import Image from "next/image";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-300">
      {/* Header */}
      <nav className="px-6 py-4 border-b border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <Image
              src="/icons/logo-dark.svg"
              alt="Melina Studio"
              width={18}
              height={18}
              className="size-[18px]"
            />
            <span className="text-sm font-semibold text-white tracking-wide">
              Melina Studio
            </span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 mb-12">Last updated: January 2025</p>

        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              Welcome to Melina Studio. We respect your privacy and are committed to protecting your personal data.
              This privacy policy explains how we collect, use, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <p className="mb-4">We collect information you provide directly to us, including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Account information (email address, name) when you sign up</li>
              <li>Content you create using our canvas and design tools</li>
              <li>Communications you send to us</li>
              <li>Usage data and analytics to improve our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide, maintain, and improve our services</li>
              <li>Process your requests and transactions</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Analyze usage patterns to enhance user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Data Storage and Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption and security measures.
              We use trusted third-party services for authentication and data storage.
              While we strive to protect your personal information, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Third-Party Services</h2>
            <p>
              We may use third-party services for authentication (such as Google OAuth), analytics, and hosting.
              These services have their own privacy policies, and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Cookies</h2>
            <p>
              We use essential cookies to maintain your session and preferences.
              We may also use analytics cookies to understand how you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page
              and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy, please contact us at{" "}
              <a href="mailto:studiomelina007@gmail.com" className="text-white hover:underline">
                studiomelina007@gmail.com
              </a>
            </p>
          </section>
        </div>

        {/* Back link */}
        <div className="mt-16 pt-8 border-t border-zinc-800">
          <Link href="/" className="text-zinc-500 hover:text-white transition-colors">
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
