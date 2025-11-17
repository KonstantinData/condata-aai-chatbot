# EU AI Act – System Card  
for the condata AAI-Chatbot  
Version 1.0 – © condata / Konstantin Milonas

This System Card describes the characteristics, purpose, data processing, risks, and safeguards of the condata AAI-Chatbot in accordance with the transparency, documentation, and accountability obligations of the EU Artificial Intelligence Act (AI Act), applying to **Limited-Risk AI Systems**.

---

# 1. System Overview

## 1.1. System Name
**condata AAI-Chatbot**

## 1.2. AI Act Classification
This system is classified as a **Limited-Risk AI System** under the EU AI Act.

It is **not**:
- a High-Risk AI system  
- a Prohibited AI practice  
- biometric identification or categorization  
- used in critical infrastructure  
- intended for legally binding decisions  

## 1.3. Provider
condata / Konstantin Milonas  
[Business Address]  
[Contact Email]

## 1.4. Purpose of the System
The condata AAI-Chatbot is designed to:
- provide information about the company’s services  
- answer user questions via text and voice  
- analyze and qualify user requests  
- assist with appointment booking, rescheduling, and cancellation  
- generate and enrich CRM entries  
- support customers interactively through natural language dialogue  
- retrieve company knowledge from a vector database (Cloudflare Vectorize)

---

# 2. Architecture & Components

## 2.1. Core System Components
- **OpenAI Realtime API** (speech recognition, speech synthesis, LLM reasoning)  
- **Cloudflare Worker** (secure proxy, server-side execution, API key isolation)  
- **Cloudflare Vectorize** (embeddings-based enterprise knowledge base)  
- **Cloudflare Pages / HTML Widget** (client interface)  
- **HubSpot CRM** (leads, scheduling, contact management)

## 2.2. High-Level Data Flow

User → Browser (Widget)
→ Cloudflare Worker (proxy, security layer)
→ OpenAI Realtime API (processing)
→ Cloudflare Vectorize (knowledge retrieval)
→ HubSpot CRM (optional: appointments & contacts)


The Worker layer ensures that no API keys are exposed client-side.

---

# 3. AI Functionalities

## 3.1. Capabilities
- Speech-to-Text and Text-to-Speech  
- Natural language understanding  
- Conversational response generation  
- Semantic search over vector data  
- Contextual request classification and analysis  
- Tool-based actions (calendar booking, CRM entry creation)

## 3.2. Model Specifications
- **Model Family:** OpenAI GPT-4o-mini-realtime  
- **Mode:** Stateless, API-based  
- **Training:** No user data used for training  
- **Memory:** No persistent storage in the model  
- **Reasoning Type:** Real-time LLM inference

---

# 4. Data Processing

## 4.1. Types of Personal Data Processed
Depending on user actions:
- text inputs  
- audio inputs (voice messages)  
- technical session events  
- optional: name, email, phone number (for appointments/contact)  
- optional: free-form problem descriptions  

## 4.2. Non-Personal Data Processed
- vectors derived from internal company content  
- performance metrics  
- anonymized event logs (minimal, Cloudflare)

## 4.3. Storage Behavior
The Provider (condata) does **not** permanently store:
- chat content  
- audio data  
- transcripts  
- user profiles  

Permanent storage occurs **only** in:
- HubSpot (CRM data voluntarily provided by user)

Temporary processing occurs in:
- OpenAI (for inference)  
- Cloudflare Worker (execution, no persistence)

## 4.4. Data Minimization Measures
- No conversation logs stored without explicit consent  
- No audio stored  
- No sensitive personal data requested  
- Embeddings contain **no** personal data  
- CRM entries created only after explicit user intent  

---

# 5. Intended Users and Application Scope

## 5.1. Intended User Groups
Businesses and website visitors in Germany, Austria, and Switzerland (DACH).

## 5.2. Intended Use Cases
- customer support and qualification  
- informational assistance  
- scheduling appointments  
- describing problems or inquiries interactively  
- sales enablement and lead qualification  

## 5.3. Excluded Use Cases
The system is **not intended** for:
- legal, financial, or medical assessments  
- decisions with legal or material consequences  
- monitoring or profiling individuals  
- processing of special category data  
- safety-critical operations  

---

# 6. User Interaction & Transparency

## 6.1. AI Disclosure
Users are informed clearly:
- that they are interacting with a KI system  
- that responses are generated automatically  

## 6.2. Human Alternative
Users may request:
- human handover  
- email contact  
- phone/online appointment with a human representative  

## 6.3. User Controls
Users can:
- choose text or voice at any time  
- withdraw consent for processing  
- request data deletion (via CRM)  
- limit information they share  

---

# 7. Risks and Mitigation

## 7.1. Identified Risks
- inaccuracies / hallucinations  
- misinterpretation of complex inquiries  
- users accidentally entering sensitive data  
- incorrect appointment parsing  
- unintended CRM entries  
- over-reliance on AI responses  

## 7.2. Mitigation Strategies
- clear AI labeling  
- user guidance prompts  
- validation steps before CRM actions  
- no autonomous high-impact decisions  
- minimal data collection  
- worker-side filtering and rate limiting  
- continual monitoring of system quality  
- embedding policy forbidding personal data  

---

# 8. Data Sources

## 8.1. Internal Sources
- service descriptions  
- FAQs  
- business processes  
- product information  
- approved marketing content  

## 8.2. External Sources
- user-provided inputs only  
- no external data scraping  
- no third-party datasets outside subprocessors

---

# 9. Monitoring and Evaluation

## 9.1. Quality Assurance
- periodic review of anonymized request types  
- monitoring tool execution errors  
- improvement of knowledge embeddings  
- supervised evaluation of system outputs

## 9.2. Technical Monitoring
- uptime and latency  
- Cloudflare firewall events  
- anonymized error logs  
- rate limits on AI requests  
- detection of abnormal usage patterns  

---

# 10. System Limitations

The system:

- is not a replacement for professional legal, medical, technical, or financial advice  
- does not guarantee factual correctness in all cases  
- does not maintain long-term memory  
- relies on user-provided information  
- cannot detect emotions, health conditions, or biometric identity  
- is not built for high-stakes decision-making  
- cannot ensure the completeness of user inputs  

---

# 11. Contact Information

For questions about this System Card or compliance inquiries:

**condata / Konstantin Milonas**  
[Business Address]  
[Email Address]

---

**© condata / Konstantin Milonas**

