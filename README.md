# Job Scrub: AI-Powered Job Search Platform

![Scrubby Mascot](public/assets/Scrubby-logo.gif)

Welcome to **Job Scrub**, an AI-enhanced platform designed to simplify the job search process and empower individuals to advance their careers through networking and community support.

**[Visit the live application](https://job-scrub.vercel.app/)**

---

## Purpose

**Job Scrub** empowers job seekers by:
- Streamlining the job hunt with AI-powered tools and intelligent filtering
- Creating a trusted community for job verification and networking
- Providing personalized career guidance through our AI assistant Scrubby
- Centralizing resume management and optimization with advanced AI analytics

---

## Core Features

### 👥 Community & Verification

- **Job Reporting**: Community members can report new job opportunities they discover
- **Verification System**: Jobs are verified by community members to reduce scams or improve job postings
- **Community Posts**: Share experiences and advice in community posts

### 🔍 Intelligent Job Search

- **Smart Filtering**: Filter jobs by location, name, job type, location type, and date
- **Saved Searches**: Save your most common searches for quick access
- **Company Metrics**: Review community-based company metrics in Acceptance Rates, Ghosting Reports, and Rejection Rates

### 📄 Resume Management & Optimization

- **S3-Powered Storage**: Securely store multiple versions of your resume in the cloud
- **Pinecone Vector Database**: Our AI leverages semantic search to match your resume to job postings
- **Drag-and-Drop Uploads**: Easily manage your documents with intuitive file handling
- **PDF Preview**: View and interact with your resume PDFs directly in the browser

### 🎯 Resume Matching

- **Job Description Analysis**: Upload any job description to compare against your resume
- **Skills Gap Identification**: Instantly see which required skills match your resume and which are missing
- **Keyword Optimization**: Get suggestions for keywords to add based on the job requirements
- **Match Score**: See a percentage match between your resume and the job description

### 🤖 Scrubby: Your AI Career Assistant

- **24/7 Job Search Guidance**: Chat with Scrubby for real-time advice on job hunting strategies
- **Resume Analysis**: Get instant feedback on your resume with actionable improvement suggestions
- **Resume Matching**: Match your resume to job descriptions and get quick feedback on how well you fit and what you can improve
- **Agentic Job Search**: Let Scrubby find jobs for you based on your resume and queries
- **Agentic Networking**: Discover other users based on your resume and queries

### 🔐 Secure Authentication & Profiles

- **Multi-Provider Auth**: Sign in with Google or traditional email/password via NextAuth
- **Firebase Integration**: Secure user data management and authentication
- **Customizable Profiles**: Create detailed profiles showcasing your skills and experience
- **Privacy Controls**: Manage what information is visible to employers and community members

---

## Technical Stack

### Frontend Framework
- **Next.js 14**: Server-side rendering and app router for optimal performance
- **TypeScript**: Type-safe development environment

### UI/UX Components
- **Radix UI & shadcn/ui**: Accessible, customizable component library
- **Tailwind CSS**: Utility-first styling with dark mode support via next-themes
- **Lucide Icons**: Modern, consistent iconography
- **Framer Motion**: Smooth animations and transitions
- **react-markdown & remark-gfm**: Rich text rendering with GitHub Flavored Markdown

### Data Management
- **AWS S3**: Secure document storage for resumes and portfolios
- **Pinecone**: Vector database for AI-powered resume matching
- **Firebase**: Real-time database, authentication, and cloud functions

### AI & Machine Learning
- **Google Gemini Integration**: Powers Scrubby's conversational intelligence and AI features
- **Hugging Face**: Offers free open source text embedding models

### Specialized Tools
- **react-dropzone**: Intuitive file upload experience
- **react-pdf & pdfjs-dist**: PDF rendering and manipulation
- **date-fns**: Date formatting and management
- **emoji-picker-react**: Enhanced user interaction with emoji support

---

## Deployment

The application is deployed via [Vercel](https://vercel.com).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Farmingdale State College Senior Project Team (Spring '25)
- [shadcn](https://shadcn.dev) for UI components
- [Vercel](https://vercel.com) for hosting
- All open-source libraries used in this project
