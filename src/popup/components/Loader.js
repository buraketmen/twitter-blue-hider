import React from "react";
import { LoadingOutlined } from "@ant-design/icons";

const CenteredLoader = ({ fontSize = 32, color = "#006fe6" }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      <LoadingOutlined style={{ fontSize: fontSize, color: color }} spin />
    </div>
  );
};

export { CenteredLoader };
