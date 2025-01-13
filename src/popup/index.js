import React, { Suspense } from "react";
import { createRoot } from "react-dom/client";
import { CenteredLoader } from "./components/Loader";
import { Col, Flex, Row, Typography, Avatar, Button } from "antd";
import { GithubOutlined } from "@ant-design/icons";
import ClearButton from "./components/ClearButton";
import AppIcon from "../static/icon.png";

const AppActivity = React.lazy(() => import("./components/AppActivity"));
import "./index.css";
import Settings from "./components/Settings";

function init() {
  const appContainer = document.createElement("div");
  document.body.appendChild(appContainer);
  if (!appContainer) {
    throw new Error("Can not find AppContainer");
  }
  const root = createRoot(appContainer);
  root.render(
    <Suspense fallback={<CenteredLoader />}>
      <Row gutter={[0, 10]} style={{ padding: 5 }}>
        <Col span={24}>
          <Flex
            align="center"
            justify="space-between"
            style={{ marginBottom: 0, marginTop: 2.5 }}
          >
            <Flex align="center">
              <Avatar
                src={AppIcon}
                alt="app icon"
                draggable={false}
                size="large"
                shape="square"
              />
              <Typography.Title
                level={5}
                style={{
                  margin: 0,
                  paddingLeft: 5,
                  opacity: 0.8,
                  marginTop: 8,
                }}
              >
                Twitter Blue Hider
              </Typography.Title>
            </Flex>
            <Flex align="center" gap={5}>
              <Flex align="center">
                <Button
                  type="ghost"
                  href="https://github.com/buraketmen/twitter-blue-hider"
                  target="_blank"
                >
                  <GithubOutlined style={{ fontSize: 20, color: "#000" }} />
                </Button>
              </Flex>
              <Settings />
            </Flex>
          </Flex>
        </Col>
        <Col span={24}>
          <AppActivity />
        </Col>
        <Col span={24}>
          <ClearButton />
        </Col>
      </Row>
    </Suspense>
  );
}

init();
