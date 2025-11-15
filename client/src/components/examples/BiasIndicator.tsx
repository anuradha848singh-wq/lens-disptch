import { BiasIndicator } from "../BiasIndicator";

export default function BiasIndicatorExample() {
  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Bias Indicator Examples</h2>
      <div className="flex gap-4 items-center">
        <BiasIndicator bias="left" />
        <BiasIndicator bias="center" />
        <BiasIndicator bias="right" />
      </div>
      <div className="flex gap-4 items-center">
        <BiasIndicator bias="left" size="sm" />
        <BiasIndicator bias="center" size="sm" />
        <BiasIndicator bias="right" size="sm" />
      </div>
    </div>
  );
}
