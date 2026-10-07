import { cn } from "@/lib/utils";
import {
  serviceEnquiry,
  serviceFacts,
  visibleServices,
} from "@/lib/creator-profile-addons";
import styles from "./addons.module.css";
import { EnquireButton, Heading, SectionHead, profileStyles } from "./shared";
import type { AddonSectionDefinition, AddonSectionProps } from "./types";

/**
 * What is on offer, how long it usually takes and, only when the creator
 * chose to list it, how it is priced. Each service has its own way in.
 */
function ServicesSection({
  id,
  portfolio,
  level,
  canContact,
}: AddonSectionProps) {
  const services = visibleServices(portfolio);
  return (
    <section id={id} className={profileStyles.section} aria-label="Services">
      <SectionHead level={level} title="Services" />
      <ul className={styles.rows}>
        {services.map((service, index) => {
          const facts = serviceFacts(service);
          const enquiry = serviceEnquiry(service);
          return (
            <li key={service.id ?? `${service.title}-${index}`}>
              <article className={styles.service}>
                <div className={cn(styles.stack, styles.serviceMain)}>
                  <Heading
                    level={level + 1}
                    className={cn(
                      styles.rowTitle,
                      styles.serviceTitle,
                      "font-heading",
                    )}
                  >
                    {service.title}
                  </Heading>
                  {service.note.trim() && (
                    <p className={styles.note}>{service.note}</p>
                  )}
                </div>
                {facts.length > 0 && (
                  <dl className={styles.facts}>
                    {facts.map((fact) => (
                      <div key={fact.label} className={styles.fact}>
                        <dt className="font-mono">{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className={styles.action}>
                  <EnquireButton
                    canContact={canContact}
                    request={{
                      topic: enquiry.topic,
                      message: enquiry.message,
                    }}
                  >
                    {enquiry.label}
                    <span className="sr-only">{enquiry.hiddenSuffix}</span>
                  </EnquireButton>
                </div>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export const servicesSection: AddonSectionDefinition = {
  filled: (portfolio) => visibleServices(portfolio).length > 0,
  Section: ServicesSection,
};
