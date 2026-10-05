import { site, whatsappLink } from "@/lib/site";

// How to reach SokoBase, for the legal and contact pages. Only shows channels that are configured.
export default function ContactLines({ topic = "Hi SokoBase" }: { topic?: string }) {
  return (
    <ul>
      {site.supportWhatsapp && (
        <li>WhatsApp: <a href={whatsappLink(site.supportWhatsapp, topic)} target="_blank" rel="noopener noreferrer">+{site.supportWhatsapp.replace(/\D/g, "")}</a></li>
      )}
      {site.contactEmail && <li>Email: <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a></li>}
      {!site.supportWhatsapp && !site.contactEmail && <li>Contact details will be published here shortly.</li>}
    </ul>
  );
}
