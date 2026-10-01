import insightLogo from '../assets/insight-logo.png';

/**
 * Brand configuration. `logoSrc` is the officially supplied Insight logo, rendered as-is
 * (never redrawn or recoloured). The import lets the single-file build inline it.
 */
export const brand = {
  name: 'Insight AI',
  line: 'AI Transformation. Built to Operate.',
  logoSrc: insightLogo as string | null,
  logoAlt: 'Insight',
};
