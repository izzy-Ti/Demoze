/**
 * Long-form copy for /about (part of the i18n content; English for now).
 * Have a local lawyer review the terms and removal policy before public launch.
 */
export type AboutSection = { id: string; heading: string; intro?: string; items?: string[] };

export function aboutContent(minGroup: number): AboutSection[] {
  return [
    {
      id: "promise",
      heading: "Our privacy promise",
      intro:
        "Demoze exists so people in Ethiopia can see fair pay without putting themselves at risk. We built it so that even we cannot tell who shared what.",
    },
    {
      id: "stored",
      heading: "What we store",
      items: [
        "The company, job title, monthly salary, bonus, years of experience, employment type, city, rating and the optional pros and cons you write.",
        "Whether a salary was verified (yes or no). Never the document itself.",
        "A one-way scrambled code (a salted SHA-256 hash) of a random id kept in a cookie in your browser. It is only used to enforce limits such as one submission per company per year. It cannot be turned back into anything about you.",
        "The time of submission, which we only ever show as month and year.",
      ],
    },
    {
      id: "not-stored",
      heading: "What we never store",
      items: [
        "Your name, email address or phone number. We never ask for them and there are no accounts.",
        "Your IP address or browser user agent.",
        "Your payslip, SMS screenshot or ID photo. It is read in memory and discarded immediately.",
        "Reviews containing phone numbers or email addresses are rejected automatically.",
      ],
    },
    {
      id: "shown",
      heading: "How we show data",
      items: [
        `Salary statistics for a company or job title only appear once at least ${minGroup} people have shared. Below that we show “Not enough data yet”.`,
        "Salaries appear as ranges (low, median, high). Individual reviews show a salary band, for example 20,000 – 25,000 ETB, never the exact figure.",
        "Experience is shown in ranges (0-2, 3-5, 6-10, 10+ years), and dates as month and year only.",
        "Nothing on the site links two reviews to the same person.",
        "Salaries far outside the normal range for a job (more than 3× or less than ⅓ of the median) are held for a moderator before they appear.",
      ],
    },
    {
      id: "verification",
      heading: "How verification works",
      items: [
        "After sharing your salary you can optionally upload a payslip, a bank salary SMS screenshot or a work document (JPG, PNG or PDF, up to 5 MB).",
        "Before uploading, cover or crop out account numbers, ID numbers and your name.",
        "Photos are shrunk in your own browser first, which also removes hidden photo data such as location.",
        "The file is sent to an AI model (Google Gemini) which reads only the company name, the monthly amount, the currency and the month, and checks whether the document looks genuine.",
        "If the company matches and the amount is within 10% of what you entered, your salary gets a purple Verified badge. Verified salaries count double when we calculate ranges.",
        "The file is never written to disk, a database, file storage or logs, and the extracted details are never shown back or saved. Only the yes/no result is kept.",
        "You can try up to 3 times per day.",
      ],
    },
    {
      id: "removal",
      heading: "How to request removal",
      items: [
        "Every review has a Report button. Choose a reason: fake or spam, identifies a person, defamatory, or wrong company.",
        "A review reported by 3 different people is hidden automatically until a moderator checks it.",
        "Because we do not know who wrote a review, we cannot look it up by person. To remove your own review, report it with the reason “Identifies a person” and mention it is yours in the details.",
        "Companies that believe a review is false or defamatory can report it in the same way.",
      ],
    },
    {
      id: "terms",
      heading: "Terms of use",
      items: [
        "Share only your own, honest salary and experience.",
        "Do not name or describe individual people, and do not post confidential business information.",
        "Information on Demoze is shared by anonymous users and is provided as-is, for general guidance. It is not financial or legal advice.",
        "We may edit, hide or remove content that breaks these rules, and limit abuse with automatic rate limits.",
        "We will never sell individual entries. Any future reports will only use aggregated statistics.",
      ],
    },
  ];
}
