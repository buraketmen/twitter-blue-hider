import React, { useEffect, useState } from "react";
import { Col, Flex, Row, Typography, Avatar, Button, Switch } from "antd";

import ListHidden from "./ListHidden";
import ListActive from "./ListActive";

const Popup = () => {
  const [appActive, setAppActive] = useState(true);

  useEffect(() => {
    chrome.storage.sync.get({ isEnabled: true }, (result) => {
      setAppActive(result.isEnabled);
    });
  }, []);

  const onAppActivityChange = (value) => {
    setAppActive(value);
    chrome.storage.sync.set({ isEnabled: value });
  };

  return (
    <Row gutter={[10, 10]}>
      <Col span={24}>
        <Typography.Text type="secondary">
          Get rid of verified accounts from your timeline.
        </Typography.Text>
      </Col>
      <Col span={24}>
        <Flex justify="center" align="center">
          <Switch
            value={appActive}
            onChange={onAppActivityChange}
            checkedChildren="Active"
            unCheckedChildren="Inactive"
            size="large"
          />
        </Flex>
      </Col>
      <Col span={24} style={{ padding: 5 }}>
        {appActive ? <ListHidden /> : <ListActive />}
      </Col>
    </Row>
  );
};

export default Popup;
