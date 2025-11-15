import { BiasFilter } from "../BiasFilter";
import { useState } from "react";

export default function BiasFilterExample() {
  const [selectedBias, setSelectedBias] = useState<("left" | "center" | "right")[]>([]);

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Bias Filter Example</h2>
      <BiasFilter selectedBias={selectedBias} onBiasChange={setSelectedBias} />
      <p className="text-sm text-muted-foreground">
        Selected: {selectedBias.length > 0 ? selectedBias.join(", ") : "None"}
      </p>
    </div>
  );
}
