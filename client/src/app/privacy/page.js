import Link from "next/link";

// Privacy policy for Life Organizer, Roger's personal Gmail-reading app. The
// Google Cloud OAuth consent screen links to this exact URL, so keep it at
// /privacy, public, and free of tracking (LoggerInit skips this path). The
// wording matches what the app actually does; change it only alongside the app.

export const metadata = {
  title: "Life Organizer — Privacy Policy",
  description: "Privacy policy for Life Organizer, a personal tool used only by Roger Kutyna.",
};

const sections = [
  {
    heading: "What it accesses.",
    body: "With the owner's permission, Life Organizer reads his own Gmail accounts through Google's read-only Gmail access (the gmail.readonly scope), and his own iCloud Mail. It cannot send, delete, move, or change any email, or mark it as read.",
  },
  {
    heading: "What it stores.",
    body: "For the last 30 days of his Inbox and Sent mail, it keeps message headers (sender, recipients, subject, date, and size) on a private server the owner controls. Message text is fetched only when the owner asks to read a message and is not stored by Life Organizer. Attachments are never downloaded or stored. Stored headers older than 30 days are deleted.",
  },
  {
    heading: "How it is used.",
    body: "The data is used only to show the owner his own mail and help him manage his own work. When the owner asks, message headers and text are passed to the AI assistant he uses (Anthropic's Claude) to answer his request. Life Organizer does not use Google user data to develop, improve, or train generalized AI or machine learning models.",
  },
  {
    heading: "Sharing.",
    body: "Google user data is not sold, shared with, or transferred to anyone else, and is not used for advertising.",
  },
  {
    heading: "Limited Use.",
    body: "Life Organizer's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
  },
  {
    heading: "Revoking access.",
    body: "Access can be revoked at any time from the Google Account's Security settings, under third-party access.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 pt-6 md:p-6 lg:p-12">
      <article className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-sm text-slate-200 leading-relaxed">
        <h1 className="text-3xl font-extrabold text-sky-100">Life Organizer — Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: November 16, 2026</p>

        <p className="mt-6">
          Life Organizer is a personal tool built and used only by its owner, Roger Kutyna. It is not
          offered to anyone else, and no one else&apos;s data is collected.
        </p>

        {sections.map((s) => (
          <p key={s.heading} className="mt-4">
            <strong className="text-sky-100">{s.heading}</strong> {s.body}
          </p>
        ))}

        <p className="mt-4">
          <strong className="text-sky-100">Contact.</strong> Questions about this policy can be sent to
          Roger through the contact details on{" "}
          <Link href="/#contact" className="text-sky-300 underline hover:text-sky-200">
            rogerkutyna.com
          </Link>
          .
        </p>
      </article>
    </div>
  );
}
