import React, { useState, useEffect } from "react";
import { Button, Popconfirm, message } from "antd";

const ClearButton = () => {
  const [isWhitelistEmpty, setIsWhitelistEmpty] = useState(true);

  useEffect(() => {
    // Check if whitelist is empty
    const checkWhitelist = async () => {
      const { whitelistedUsers = [] } = await chrome.storage.sync.get(
        "whitelistedUsers"
      );
      setIsWhitelistEmpty(whitelistedUsers.length === 0);
    };

    checkWhitelist();

    // Listen for changes in storage
    const handleStorageChange = (changes) => {
      if (changes.whitelistedUsers) {
        setIsWhitelistEmpty(changes.whitelistedUsers.newValue.length === 0);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const clearWhitelist = async () => {
    try {
      await chrome.storage.sync.set({ whitelistedUsers: [] });

      // Try to send message to content script
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tab?.url?.includes("twitter.com")) {
          await chrome.tabs.sendMessage(tab.id, { type: "REFRESH_FEED" });
        }
      } catch (error) {
        // Silent error
      }

      message.success("Whitelist cleared successfully.");
    } catch (error) {
      message.error("Failed to clear whitelist.");
    }
  };

  return (
    <Popconfirm
      placement="top"
      title="Clear Whitelist"
      description="Are you sure you want to clear all whitelisted users? This will make their tweets hidden again."
      okText="Confirm"
      cancelText="Back"
      okType="danger"
      onConfirm={clearWhitelist}
      styles={{
        root: {
          paddingLeft: 4,
          paddingRight: 4,
          fontSize: 13,
        },
      }}
    >
      <Button block type="primary" danger disabled={isWhitelistEmpty}>
        Clear Whitelist
      </Button>
    </Popconfirm>
  );
};

export default ClearButton;
