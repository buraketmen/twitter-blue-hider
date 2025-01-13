import React from "react";
import { Avatar, Row, Col, Flex } from "antd";

export default function ListActive() {
  return (
    <Row gutter={[0, 0]}>
      <Col
        span={24}
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: 6,
          padding: 5,
          background: "linear-gradient(to bottom, #ffffff, #f0f0f0)",
        }}
      >
        <Row gutter={[0, 10]}>
          {[
            {
              name: "John Doe",
              username: "@johndoe",
            },

            {
              name: "Alice Johnson",
              username: "@alicejohnson",
            },
            {
              name: "Sarah Smith",
              username: "@sarahsmith",
            },
          ].map((user, index) => (
            <Col span={24} key={index} style={{ height: 38 }}>
              <Flex gap={10} style={{ height: "100%", width: "100%" }}>
                <Flex
                  align="center"
                  justify="center"
                  style={{
                    width: 32,
                    height: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Avatar size={32}>{user.name.charAt(0)}</Avatar>
                </Flex>
                <Flex vertical gap={2} style={{ width: "100%", height: 40 }}>
                  <Flex align="center" gap={4} style={{ height: 19 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>
                      {user.name}
                    </span>
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path
                        fill="#1DA1F2"
                        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
                      />
                    </svg>
                  </Flex>
                  <Flex align="center" style={{ height: 19 }}>
                    <span style={{ fontSize: 12, color: "#666" }}>
                      {user.username}
                    </span>
                  </Flex>
                </Flex>
              </Flex>
            </Col>
          ))}
        </Row>
      </Col>
    </Row>
  );
}
