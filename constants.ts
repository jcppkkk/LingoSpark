import { 
  BookOpen, 
  Brain, 
  Plus, 
  RefreshCw, 
  RotateCcw, 
  Search, 
  Volume2,
  CheckCircle,
  Clock,
  Image as ImageIcon,
  Zap,
  LayoutDashboard,
  Camera,
  Cloud,
  CloudLightning
} from 'lucide-react';

export const Icons = {
  Dashboard: LayoutDashboard,
  Learn: Brain,
  Add: Plus,
  Flip: RotateCcw,
  Regenerate: RefreshCw,
  Search: Search,
  Audio: Volume2,
  Check: CheckCircle,
  Time: Clock,
  Image: ImageIcon,
  Flash: Zap,
  Book: BookOpen,
  Camera: Camera,
  Cloud: Cloud,
  Sync: CloudLightning
};

export const APP_NAME = "LingoSpark";

// Simplified SM-2 Default Values
export const DEFAULT_EFACTOR = 2.5;
export const DEFAULT_INTERVAL = 0;
export const DEFAULT_REPETITION = 0;

// Google Drive Sync Config
// NOTE: To enable Google Drive Sync, you must create a project in Google Cloud Console,
// enable the "Google Drive API", and create an OAuth 2.0 Client ID for Web Application.
// Add 'http://localhost:port' to Authorized JavaScript origins.
export const GOOGLE_DRIVE_CLIENT_ID = "885392911088-ibmq2i05lfk0ih49nv4p8lgc4g36kvlt.apps.googleusercontent.com"; 

// WARNING: DO NOT put a Client Secret here (starts with GOCSPX-). 
// This should be a public API Key (starts with AIza...) if you have one, otherwise leave empty.
export const GOOGLE_DRIVE_API_KEY = ""; 
export const GOOGLE_DRIVE_SCOPES = "https://www.googleapis.com/auth/drive.appdata";