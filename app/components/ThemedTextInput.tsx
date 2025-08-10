import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import React from "react";
import { StyleSheet, TextInput, TextInputProps } from "react-native";

export default function ThemedTextInput(props: TextInputProps) {
    const colorScheme = useColorScheme() ?? "light";
    const colors = Colors[colorScheme];
    const placeholderColor = colorScheme === "dark" ? "#aaa" : "#666";
  
    return (
      <TextInput
        key={colorScheme}
        placeholderTextColor={placeholderColor}
        style={[
          styles.input,
          {
            color: colors.text,               
            backgroundColor: colors.backgroundInput,
            borderColor: colors.border,
          },
          props.style,
        ]}
        {...props}
      />
    );
  }
  

const styles = StyleSheet.create({
  input: {
    marginVertical: 8,
    borderWidth: 1,
    padding: 10,
    borderRadius: 4,
  },
});
