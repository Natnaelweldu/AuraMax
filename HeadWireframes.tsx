import React from "react";
import MeshScanner from "./MeshScanner";

interface BiometricScannerProps {
  frontImage: string | null;
  sideImage: string | null;
  closeupImage: string | null;
  onMetricsChanged: (metrics: {
    faceShape: string;
    asymmetryIndex: number;
    postureAngle: number;
  }) => void;
}

export const BiometricScanner: React.FC<BiometricScannerProps> = ({
  frontImage,
  sideImage,
  closeupImage,
  onMetricsChanged,
}) => {
  return (
    <MeshScanner
      frontImage={frontImage}
      sideImage={sideImage}
      closeupImage={closeupImage}
      onMetricsChanged={onMetricsChanged}
    />
  );
};
