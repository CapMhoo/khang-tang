import "react-native-url-polyfill/auto";

import { createClient } from "@supabase/supabase-js";

// Use the EXPO_PUBLIC prefix so the app can see them
const supabaseUrl = "https://qsozjmavzjasbglvlvxj.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzb3pqbWF2emphc2JnbHZsdnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNDYzMjcsImV4cCI6MjA4NDcyMjMyN30.xftgRcgbwwDatUmPj4jBUIQWbuw6E9dFWtlioetFAss";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
