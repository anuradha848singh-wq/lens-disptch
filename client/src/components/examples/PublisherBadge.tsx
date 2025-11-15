import { PublisherBadge } from "../PublisherBadge";
import globalTimesLogo from "@assets/generated_images/Global_Times_publisher_logo_ca784f81.png";
import techDailyLogo from "@assets/generated_images/Tech_Daily_publisher_logo_1c01fd2a.png";

export default function PublisherBadgeExample() {
  return (
    <div className="p-8 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Publisher Badge Examples</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Small size:</p>
          <PublisherBadge name="Global Times" logo={globalTimesLogo} size="sm" />
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground mb-2">Medium size:</p>
          <PublisherBadge name="Tech Daily" logo={techDailyLogo} size="md" />
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground mb-2">Large size with fallback:</p>
          <PublisherBadge name="World Report" size="lg" />
        </div>
      </div>
    </div>
  );
}
