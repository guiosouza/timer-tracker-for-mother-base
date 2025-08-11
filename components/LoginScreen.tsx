import { auth } from "@/app/services/firebase";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme.web";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Switch, Text, View } from "react-native";
import ThemedTextInput from "./ThemedTextInput";

type LoginScreenProps = {
  onLoginSuccess: () => void;
};

export default function LoginScreen({
  onLoginSuccess: onLoginSuccess,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  useEffect(() => {
    (async () => {
      try {
        const savedEmail = await AsyncStorage.getItem("@saved_email");
        const savedPassword = await AsyncStorage.getItem("@saved_password");
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRemember(true);
        }
      } catch (e) {
        console.log("Erro ao carregar credenciais", e);
      }
    })();
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage(null); // limpa mensagem anterior
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (remember) {
        await AsyncStorage.setItem("@saved_email", email);
        await AsyncStorage.setItem("@saved_password", password);
      } else {
        await AsyncStorage.removeItem("@saved_email");
        await AsyncStorage.removeItem("@saved_password");
      }
      onLoginSuccess();
    } catch (error: any) {
      console.log("Erro no login:", error);
      setErrorMessage(error.message || "Email ou senha inválidos");
    } finally {
      setLoading(false);
    }
  };

  const clearCredentials = async () => {
    await AsyncStorage.removeItem("@saved_email");
    await AsyncStorage.removeItem("@saved_password");
    setEmail("");
    setPassword("");
    setRemember(false);
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
    >
      {errorMessage && (
        <Text style={[styles.errorText, { color: colors.text }]}>
          {errorMessage}
        </Text>
      )}
      <ThemedTextInput
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <ThemedTextInput
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.rememberContainer}>
        <Switch value={remember} onValueChange={setRemember} />
        <Text style={{ color: colors.text, marginLeft: 8 }}>Lembrar</Text>
      </View>

      <Button
        title={loading ? "Entrando..." : "Entrar"}
        onPress={handleLogin}
        disabled={loading}
      />

      <Button
        title="Limpar credenciais"
        onPress={clearCredentials}
        color="red"
      />
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  input: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 4,
  },
  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  errorText: {
    marginVertical: 8,
    fontWeight: "bold",
    color: "red",
  },
});
