import { Linking, Platform, TouchableOpacity, Text } from 'react-native';
import { openBrowserAsync } from 'expo-web-browser';
import React from 'react';

type ExternalLinkProps = {
  href: string;
  children: React.ReactNode;
};

export function ExternalLink({ href, children }: ExternalLinkProps) {
  return (
    <TouchableOpacity
      onPress={async () => {
        if (Platform.OS !== 'web') {
          await openBrowserAsync(href); // Open in in-app browser
        } else {
          Linking.openURL(href); // Open in default browser for web
        }
      }}
    >
      <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>{children}</Text>
    </TouchableOpacity>
  );
}