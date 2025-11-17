# Data Processing Agreement (DPA)
for the condata AAI-Chatbot  
Version 1.0 – © condata / Konstantin Milonas

This Data Processing Agreement (“Agreement”) governs the processing of personal data in connection with the use of the condata AAI-Chatbot (“Service”) by a business customer (“Customer”) in accordance with the General Data Protection Regulation (GDPR).

---

# 1. Roles and Responsibilities

## 1.1. Provider as Processor
The Provider (condata / Konstantin Milonas) processes personal data solely on behalf of the Customer and in accordance with the Customer’s documented instructions.

## 1.2. Customer as Controller
The Customer is the data controller within the meaning of Art. 4(7) GDPR for all personal data processed through the Service.

## 1.3. Subprocessors
The Provider engages the following subprocessors:

1. **OpenAI (EU/USA)**  
   – Processing of textual and audio data (Realtime API)

2. **Cloudflare Inc. (global, incl. EU)**  
   – Hosting, edge compute, Vectorize, Worker infrastructure

3. **HubSpot (EU/USA)**  
   – CRM, scheduling and contact management

Subprocessors are bound by Data Processing Agreements compliant with Art. 28 GDPR.

---

# 2. Nature and Categories of Personal Data

## 2.1. Personal Data Processed
Depending on usage, the following data may be processed:

- Name, first name  
- Email address, phone number  
- Company affiliation  
- Appointment-related data  
- Text inputs by users  
- Voice/audio data transmitted during interactions  
- Technical metadata (timestamps, session IDs)

## 2.2. Special Categories of Data
The Service does not request sensitive data (Art. 9 GDPR).  
If users voluntarily submit such data, processing applies strictly for handling the inquiry.

---

# 3. Purpose of Processing

Personal data is processed for the following purposes:

1. Responding to inquiries (text or voice)  
2. Providing information about the Customer’s services  
3. Qualification and categorization of requests  
4. Booking, rescheduling, or cancelling appointments  
5. Creating and managing CRM entries in HubSpot  
6. Sending confirmation messages (email/WhatsApp)  
7. Operation, optimization, and maintenance of the Service

Processing is performed **exclusively on behalf of the Customer**.

---

# 4. Legal Basis

Processing is carried out pursuant to:

- **Art. 6(1)(b) GDPR** – Performance of a contract  
- **Art. 6(1)(f) GDPR** – Legitimate interests (technical operation)  
- **Art. 6(1)(a) GDPR** – Consent (contact and scheduling data)

The Customer must ensure a lawful basis for the transmission of personal data.

---

# 5. Data Storage and Transfers

## 5.1. Storage by the Provider
The Provider does **not** permanently store personal data.  
Processing occurs transiently within Cloudflare Worker environments.

## 5.2. Storage by Subprocessors
- HubSpot stores CRM and appointment data  
- Cloudflare stores technical data & embeddings (non-personal, company information only)  
- OpenAI processes data temporarily to fulfill AI functionality  

The Provider ensures that subprocessors:
- operate under GDPR-compliant contracts  
- process data only for the stated purposes  

---

# 6. Data Minimization

The Provider ensures:

- no storage of full conversations without explicit consent  
- no retention of audio or text data beyond processing  
- no transfer of unnecessary personal data  
- CRM entries created only when user explicitly requests a booking or contact  

The Customer must minimize the transmission of personal data wherever possible.

---

# 7. Deletion & Retention

## 7.1. Deletion by the Provider
As no personal data is stored by the Provider, deletion is not required within the Provider’s systems.

## 7.2. Deletion by Subprocessors
- HubSpot: deletion according to Customer instructions  
- OpenAI: no persistent storage  
- Cloudflare: technical retention per system lifecycle

## 7.3. Deletion Upon Customer Request
The Provider will delete or anonymize data within subcontractor systems upon Customer request, if technically feasible.

---

# 8. Technical and Organizational Measures (TOMs)

The Provider ensures:

- TLS encryption for all connections  
- server-side storage of all API keys  
- minimal logging within Cloudflare Worker  
- roles and access control mechanisms  
- protection against unauthorized processing  
- strong authentication policies (e.g., MFA)  
- restricted and audited subprocessors  

---

# 9. Data Subject Rights

The Provider assists the Customer in fulfilling data subject rights under GDPR, including:

- Right of access (Art. 15)  
- Right to rectification (Art. 16)  
- Right to erasure (Art. 17)  
- Right to restriction (Art. 18)  
- Right to data portability (Art. 20)  
- Right to object (Art. 21)  

Requests from end-users must be directed to the Customer.

---

# 10. Incident Response

The Provider will notify the Customer without undue delay regarding any personal data breach involving the Service.

The Customer remains responsible for notifying supervisory authorities and affected individuals.

---

# 11. AI Transparency & EU AI Act Compliance

The condata AAI-Chatbot is classified as a **Limited-Risk AI System** under the EU AI Act.

The Provider ensures:

- transparency regarding the use of AI  
- proper system documentation (AI System Card)  
- safety and non-discrimination measures  
- monitoring of critical technical events  

The Customer shall:
- inform users of the use of AI  
- maintain a human fallback option  

---

# 12. Confidentiality

Both parties agree to keep all non-public personal and business information confidential.

---

# 13. Term

This Agreement applies for the duration of the Customer’s use of the Service.

---

# 14. Final Provisions

If any provision of this Agreement is invalid, the remainder shall remain effective.  
German law applies.  
The place of jurisdiction is the Provider’s registered business location.

---

**© condata / Konstantin Milonas**
