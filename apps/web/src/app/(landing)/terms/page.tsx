import Link from "next/link";
import Image from "next/image";

export default function TermsOfService() {
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
        <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-zinc-500 mb-12">Last updated: January 2025</p>

        <div className="space-y-8 text-zinc-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Melina Studio, you agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
            <p>
              Melina Studio is an AI-powered design tool that allows users to create visual content through
              conversational interaction. We provide a canvas-based interface where you can describe your ideas
              and our AI assistant helps bring them to life.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. User Accounts</h2>
            <p className="mb-4">To use certain features of Melina Studio, you must create an account. You agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. User Content</h2>
            <p className="mb-4">
              You retain ownership of the content you create using Melina Studio. By using our service, you grant us
              a limited license to store and process your content solely for the purpose of providing the service.
            </p>
            <p>You agree not to create content that:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-4">
              <li>Violates any applicable laws or regulations</li>
              <li>Infringes on intellectual property rights of others</li>
              <li>Contains harmful, abusive, or offensive material</li>
              <li>Attempts to exploit or harm minors</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Acceptable Use</h2>
            <p className="mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Use the service for any illegal purpose</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use automated systems to access the service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Intellectual Property</h2>
            <p>
              Melina Studio and its original content, features, and functionality are owned by us and are protected
              by international copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Disclaimer of Warranties</h2>
            <p>
              Melina Studio is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
              either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
            <p>
              To the fullest extent permitted by law, Melina Studio shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages resulting from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account at our sole discretion, without notice,
              for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Changes to Terms</h2>
            <p>
              We may modify these terms at any time. We will notify users of any material changes by posting the updated
              terms on this page. Your continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Contact Us</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{" "}
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
