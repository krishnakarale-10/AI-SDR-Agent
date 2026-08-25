import {suggestCampaignTargeting} from "../src/services/campaign.service.js";

const test = {
  "product_description": "We sell a fraud detection API that plugs into payment platforms and flags suspicious transactions in real time.",
  "value_props": [
    "Reduces false positives by 40%",
    "Real-time detection, no checkout delay"
  ],
  "tone": "Direct" 
};

const testRunner =async()=>{
    const result = await suggestCampaignTargeting(test.product_description,test.value_props,test.tone);
    console.log(result);
}

testRunner();