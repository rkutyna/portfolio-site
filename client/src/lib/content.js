// Site copy loading.
//
// Every editable string lives in the `site_content` table and is served by
// GET /api/content. These defaults exist only so the site still renders sane
// text if the API is unreachable during a build or a request — the database is
// the source of truth once the server has seeded itself.
export const CONTENT_DEFAULTS = {
  site_title: "R. Kutyna | Roger Kutyna's ML/AI Portfolio",
  site_description: "Roger Kutyna's ML/AI portfolio.",
  brand_name: 'Roger Kutyna',
  hero_title: 'Roger Kutyna',
  hero_subtitle:
    'ML and applied AI engineer. M.Sc. Information Technology (Generative AI), Clark University. Bird photographer.',
  hero_primary_label: 'View My Work',
  hero_primary_href: '#projects',
  contact_email: 'rkutyna@clarku.edu',
  about_heading: 'About',
  about_body:
    "I'm an ML and applied AI engineer with an M.Sc. in Information Technology (Generative AI) from Clark University. I build practical systems that put machine learning to work, and when I'm not doing that you'll usually find me outside with a camera pointed at a bird.",
  projects_heading: 'Projects',
  blogs_heading: 'Blog Posts',
  photos_heading: 'Photo Gallery',
  photos_intro: '',
  contact_heading: 'Contact',
  contact_body:
    "The fastest way to reach me is email. I'm always happy to talk about ML, engineering work, or birds.",
  resume_heading: 'Resume',
  footer_text: 'All rights reserved.',
};

// Grouping and labels for the admin editor. Order here is the order shown.
export const CONTENT_SECTIONS = [
  {
    id: 'site',
    label: 'Site & Metadata',
    description: 'Browser tab title, search-engine description, and the name in the header.',
    fields: [
      { key: 'site_title', label: 'Browser tab title', type: 'text' },
      { key: 'site_description', label: 'Meta description', type: 'textarea', rows: 2 },
      { key: 'brand_name', label: 'Header / footer name', type: 'text' },
    ],
  },
  {
    id: 'hero',
    label: 'Home Hero',
    description: 'The banner at the top of the home page.',
    fields: [
      { key: 'hero_title', label: 'Headline', type: 'text' },
      { key: 'hero_subtitle', label: 'Subtitle', type: 'textarea', rows: 3 },
      { key: 'hero_primary_label', label: 'Button label', type: 'text' },
      { key: 'hero_primary_href', label: 'Button link', type: 'text', hint: 'e.g. #projects or /photos' },
      { key: 'contact_email', label: 'Contact email', type: 'text' },
    ],
  },
  {
    id: 'about',
    label: 'About Section',
    description: 'Shown on the home page under the About nav link.',
    fields: [
      { key: 'about_heading', label: 'Heading', type: 'text' },
      { key: 'about_body', label: 'Body', type: 'textarea', rows: 6, markdown: true },
    ],
  },
  {
    id: 'sections',
    label: 'Section Headings',
    description: 'Titles above each list of content.',
    fields: [
      { key: 'projects_heading', label: 'Projects heading', type: 'text' },
      { key: 'blogs_heading', label: 'Blog posts heading', type: 'text' },
      { key: 'photos_heading', label: 'Photo gallery heading', type: 'text' },
      { key: 'photos_intro', label: 'Photo gallery intro', type: 'textarea', rows: 3, hint: 'Optional. Leave blank to hide.' },
      { key: 'resume_heading', label: 'Resume heading', type: 'text' },
    ],
  },
  {
    id: 'contact',
    label: 'Contact Section',
    description: 'Shown on the home page under the Contact nav link.',
    fields: [
      { key: 'contact_heading', label: 'Heading', type: 'text' },
      { key: 'contact_body', label: 'Body', type: 'textarea', rows: 4, markdown: true },
    ],
  },
  {
    id: 'footer',
    label: 'Footer',
    fields: [{ key: 'footer_text', label: 'Footer line', type: 'text', hint: 'Follows "© <year> <name>."' }],
  },
];

// Inside the container, talk to the API service directly. Falls back to the
// public URL for local development where no internal alias exists.
const serverApiBase = () =>
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://server:3001/api';

/**
 * Fetch site copy on the server. Never throws: on any failure the caller gets
 * the compiled-in defaults so a page still renders.
 */
export async function getContent() {
  try {
    const res = await fetch(`${serverApiBase()}/content`, {
      // Copy changes rarely and is edited by one person; a short revalidate
      // keeps pages cheap without making edits feel stuck.
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error(`content responded ${res.status}`);
    const data = await res.json();
    return { ...CONTENT_DEFAULTS, ...data };
  } catch (err) {
    console.error('Falling back to default site content:', err.message);
    return { ...CONTENT_DEFAULTS };
  }
}
