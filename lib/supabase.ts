import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

// Replace these with the keys you just copied from the website
const SUPABASE_URL = "https://enjujypttvirtyubzoud.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuanVqeXB0dHZpcnR5dWJ6b3VkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzE2ODUsImV4cCI6MjA4Mzk0NzY4NX0.ThryoCXLrSmPOGLdrfAfl0qW805jO5xbKy5UFUC5o9U";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
