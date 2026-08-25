import { ApiError } from "../utils/apiErrors.js";
import "dotenv/config";
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to add a timeout to fetch requests (prevents hanging connections)
const fetchWithTimeout = async (url, options = {}, timeout = 15000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};
export const searchSnovLeads = async (searchCriteria, limit = 50) => {
  const { SNOV_CLIENT_ID, SNOV_CLIENT_SECRET } = process.env;

  if (!SNOV_CLIENT_ID || !SNOV_CLIENT_SECRET) {
    throw new ApiError(500, "Snov.io API credentials missing from .env.");
  }

  try {
    // 1. Authenticate to get OAuth2 token
    const authRes = await fetchWithTimeout("https://api.snov.io/v1/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: SNOV_CLIENT_ID,
        client_secret: SNOV_CLIENT_SECRET
      })
    });
    
    const authData = await authRes.json();
    if (!authData.access_token) throw new ApiError(401, "Snov.io auth failed.");
    const token = authData.access_token;

    // 2. Start the Global Database Search Task
    const payload = {
      limit: limit,
      filters: {
        prospect: {
          job_titles: {
            include: searchCriteria.job_titles || []
          },
          countries: searchCriteria.locations || [] // E.g., ['United States', 'United Kingdom']
        },
        company: {
          industries: searchCriteria.industry_keywords || [],
          size: searchCriteria.company_sizes || [] // Maps well to Snov's standard size tiers
        }
      }
    };

    const startRes = await fetchWithTimeout("https://api.snov.io/v2/database-search/prospects/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const startData = await startRes.json();
    const taskHash = startData.meta?.task_hash || startData.task_hash;
    if (!taskHash) throw new ApiError(500, "Failed to start Snov.io search task.");

    // 3. Poll for results (Wait for Snov to gather and verify emails)
    console.log(`\n⏳ Extracting global leads matching AI criteria via Snov.io...`);
    await delay(8000); 

    // 4. Retrieve the results
    const resultRes = await fetchWithTimeout(`https://api.snov.io/v2/database-search/prospects/result/${taskHash}`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    const resultData = await resultRes.json();
    // In Snov V2, prospects are inside resultData.data.prospects
    const prospects = resultData.data?.prospects || resultData.prospects || [];

    // 5. Enhance prospects with company emails and map to our schema
    const enhancedLeads = await Promise.all(prospects.map(async (lead) => {
      let companyEmail = null;
      const domain = lead.company?.domain;
      
      if (domain) {
        try {
          const emailRes = await fetchWithTimeout(`https://api.snov.io/v2/domain-emails-with-info?domain=${encodeURIComponent(domain)}&type=all&limit=1`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
          });
          const emailData = await emailRes.json();
          if (emailData.emails && emailData.emails.length > 0) {
            companyEmail = emailData.emails[0].email;
          }
        } catch (e) {
          console.error(`Failed to fetch email for domain ${domain}`, e);
        }
      }

      return {
        full_name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
        email: companyEmail,
        company: lead.company?.name || null,
        job_title: lead.job_title || null,
        linkedin: lead.linkedin_url || null,
        source: "SNOV",
        fit_score: null, 
        ai_insight: "Pending analysis..."
      };
    }));

    return enhancedLeads;

  } catch (error) {
    console.error("Snov API Exception:", error);
    throw new ApiError(500, "An error occurred while fetching verified emails from Snov.io.");
  }
};