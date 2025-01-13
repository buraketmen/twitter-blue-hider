import React, { useEffect, useRef, useState } from "react";
import { Flex, Typography, Switch, Tooltip, Dropdown } from "antd";
import { SettingOutlined } from "@ant-design/icons";

const Settings = () => {
  const lastSettingsKey = useRef(null);
  const [settings, setSettings] = useState({
    visible: false,
    showCard: true,
  });

  useEffect(() => {
    chrome.storage.sync.get({ showCard: true }, (result) => {
      setSettings((prev) => ({
        ...prev,
        showCard: result.showCard,
      }));
    });

    const handleStorageChange = (changes) => {
      if (changes.showCard) {
        setSettings((prev) => ({
          ...prev,
          showCard: changes.showCard.newValue,
        }));
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const keepSettingsOpen = (key) => {
    return ["ShowCard"].includes(key);
  };

  const handleSettingsMenuClick = (info) => {
    const { key } = info;
    lastSettingsKey.current = key;
    setSettings((prev) => ({
      ...prev,
      visible: keepSettingsOpen(key),
    }));
  };

  const onSettingsOpenChange = (open, info) => {
    if (info?.source === "menu" && keepSettingsOpen(lastSettingsKey.current)) {
      setSettings((prev) => ({ ...prev, visible: true }));
    } else {
      setSettings((prev) => ({ ...prev, visible: open }));
    }
  };

  const onShowCardChange = (checked) => {
    chrome.storage.sync.set({ showCard: checked }, () => {
      setSettings((prev) => ({
        ...prev,
        showCard: checked,
      }));
    });
  };

  return (
    <Dropdown
      destroyPopupOnHide
      trigger={["click"]}
      placement="bottomRight"
      open={settings.visible}
      onOpenChange={onSettingsOpenChange}
      arrow
      menu={{
        style: { width: 160, borderRadius: 4 },
        onClick: handleSettingsMenuClick,
        items: [
          {
            key: "ShowCard",
            label: (
              <Flex align="center" justify="space-between">
                <Tooltip
                  title="Indicates whether hidden cards are shown or hidden."
                  placement="bottom"
                >
                  <Typography.Text>Show Cards</Typography.Text>
                </Tooltip>
                <Switch
                  checked={settings.showCard}
                  onChange={onShowCardChange}
                />
              </Flex>
            ),
          },
        ],
      }}
    >
      <SettingOutlined style={{ fontSize: 20, paddingRight: 10 }} />
    </Dropdown>
  );
};

export default Settings;
