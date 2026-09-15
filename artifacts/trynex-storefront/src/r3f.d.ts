import type { ThreeElements } from "@react-three/fiber";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: ThreeElements["group"];
      mesh: ThreeElements["mesh"];
      meshPhysicalMaterial: ThreeElements["meshPhysicalMaterial"];
      meshStandardMaterial: ThreeElements["meshStandardMaterial"];
      hemisphereLight: ThreeElements["hemisphereLight"];
      directionalLight: ThreeElements["directionalLight"];
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      group: ThreeElements["group"];
      mesh: ThreeElements["mesh"];
      meshPhysicalMaterial: ThreeElements["meshPhysicalMaterial"];
      meshStandardMaterial: ThreeElements["meshStandardMaterial"];
      hemisphereLight: ThreeElements["hemisphereLight"];
      directionalLight: ThreeElements["directionalLight"];
    }
  }
}

declare module "react/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      group: ThreeElements["group"];
      mesh: ThreeElements["mesh"];
      meshPhysicalMaterial: ThreeElements["meshPhysicalMaterial"];
      meshStandardMaterial: ThreeElements["meshStandardMaterial"];
      hemisphereLight: ThreeElements["hemisphereLight"];
      directionalLight: ThreeElements["directionalLight"];
    }
  }
}

declare module "react/jsx-dev-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      group: ThreeElements["group"];
      mesh: ThreeElements["mesh"];
      meshPhysicalMaterial: ThreeElements["meshPhysicalMaterial"];
      meshStandardMaterial: ThreeElements["meshStandardMaterial"];
      hemisphereLight: ThreeElements["hemisphereLight"];
      directionalLight: ThreeElements["directionalLight"];
    }
  }
}
