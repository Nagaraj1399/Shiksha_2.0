export type NavSectionId =
  'home' | 'for-students' | 'for-teachers' | 'how-it-works' | 'contact';

export const LANDING_NAV_LINKS: ReadonlyArray<{
  id: NavSectionId;
  label: string;
  href: string;
}> = [
  { id: 'home', label: 'Home', href: '#home' },
  { id: 'for-students', label: 'For Students', href: '#for-students' },
  { id: 'for-teachers', label: 'For Teachers', href: '#for-teachers' },
  { id: 'how-it-works', label: 'How it works', href: '#how-it-works' },
  { id: 'contact', label: 'Contact', href: '#contact' },
];
