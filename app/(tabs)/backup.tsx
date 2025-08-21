import * as Clipboard from 'expo-clipboard';
import { ActivityIndicator, Alert, Image, StyleSheet, TouchableOpacity, View } from "react-native";

import { auth, database } from "@/app/services/firebase";
import LoginScreen from "@/components/LoginScreen";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { get, ref } from "firebase/database";
import { useEffect, useState } from "react";

interface LevelImage {
  level: number;
  path: string;
  name: string;
}

// Array com as patentes e suas respectivas imagens
const urlImages: LevelImage[] = [ 
  { level: 1, path: "novice.png", name: "Novice" }, 
  { level: 203000, path: "novice-2.png", name: "Novice 2" }, 
  { level: 817000, path: "diamond_dog.png", name: "Diamond Dog" }, 
  { level: 1625000, path: "gnome_soldier.png", name: "Gnome Soldier" }, 
  { 
    level: 9947000, 
    path: "outer_heaven_soldier.png", 
    name: "Outer Heaven Soldier", 
  }, 
  { 
    level: 28992000, 
    path: "militaires_sans_frontieres.png", 
    name: "Militaires Sans Frontières", 
  }, 
  { level: 69984000, path: "fox.png", name: "Fox" }, 
  { 
    level: 101600000, 
    path: "desperado_enforcement_llc.png", 
    name: "Desperado Enforcement LLC", 
  }, 
  { 
    level: 181999900, 
    path: "les_enfants_terribles.png", 
    name: "Les Enfants Terribles", 
  }, 
  { 
    level: 280000000, 
    path: "fox_hound_special_forces.png", 
    name: "FOX HOUND Special Forces", 
  }, 
  { level: 888000000, path: "big_boss.png", name: "Snake" }, 
  { level: 1999999998, path: "the_boss.png", name: "The Boss" }, 
  { level: 2912000000, path: "venom_snake.png", name: "Venom Snake" }, 
];

// Mapeamento de nomes de arquivos para módulos de imagem
const imageMapping: {[key: string]: any} = {
  "novice.png": require("@/assets/images/novice.png"),
  "novice-2.png": require("@/assets/images/novice-2.png"),
  "diamond_dog.png": require("@/assets/images/diamond_dog.png"),
  "gnome_soldier.png": require("@/assets/images/gnome_soldier.png"),
  "outer_heaven_soldier.png": require("@/assets/images/outer_heaven_soldier.png"),
  "militaires_sans_frontieres.png": require("@/assets/images/militaires_sans_frontieres.png"),
  "fox.png": require("@/assets/images/fox.png"),
  "desperado_enforcement_llc.png": require("@/assets/images/desperado_enforcement_llc.png"),
  "les_enfants_terribles.png": require("@/assets/images/les_enfants_terribles.png"),
  "fox_hound_special_forces.png": require("@/assets/images/fox_hound_special_forces.png"),
  "big_boss.png": require("@/assets/images/big_boss.png"),
  "the_boss.png": require("@/assets/images/the_boss.png"),
  "venom_snake.png": require("@/assets/images/venom_snake.png"),
};

// Função para determinar a patente atual com base no nível
const getCurrentRank = (level: number | null): LevelImage => {
  if (!level) return urlImages[0]; // Retorna a primeira patente se o nível for nulo
  
  // Encontra a patente mais alta que o usuário alcançou
  for (let i = urlImages.length - 1; i >= 0; i--) {
    if (level >= urlImages[i].level) {
      return urlImages[i];
    }
  }
  
  return urlImages[0]; // Retorna a primeira patente como fallback
};

export default function BackupScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);
  const [userLevel, setUserLevel] = useState<number | null>(null);
  const [currentExp, setCurrentExp] = useState<number | null>(null);
  const [taskTimes, setTaskTimes] = useState<{[key: string]: string}>({});
  const [currentRank, setCurrentRank] = useState<LevelImage>(urlImages[0]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
      if (user) {
        fetchUserData(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (uid: string) => {
    setIsLoading(true);
    try {
      // Buscar apenas dados de gamificação
      const gamificationRef = ref(database, `gamificationUserData/${uid}`);
      const gamificationSnapshot = await get(gamificationRef);
      const gamificationData = gamificationSnapshot.exists() ? gamificationSnapshot.val() : {};

      // Estruturar os dados incluindo o ID do usuário
      const completeData = {
        "gamificationUserData": {
          [uid]: gamificationData
        }
      };

      setBackupData(completeData);
      
      // Extrair informações específicas para exibição
      if (gamificationData) {
        const level = gamificationData.userLevel || 0;
        setUserLevel(level);
        setCurrentExp(gamificationData.currentExp || 0);
        setCurrentRank(getCurrentRank(level));
        
        // Extrair tempos acumulados de cada tarefa
        const times: {[key: string]: string} = {};
        Object.keys(gamificationData).forEach(key => {
          if (gamificationData[key] && 
              typeof gamificationData[key] === 'object' && 
              gamificationData[key].totalTimeTracked) {
            times[key] = gamificationData[key].totalTimeTracked;
          }
        });
        setTaskTimes(times);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar os dados do Firebase.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!backupData) {
      Alert.alert("Erro", "Nenhum dado disponível para copiar.");
      return;
    }

    await Clipboard.setStringAsync(JSON.stringify(backupData, null, 2));
    Alert.alert("Sucesso", "JSON copiado para a área de transferência!");
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    if (auth.currentUser) {
      fetchUserData(auth.currentUser.uid);
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#E8E8E8", dark: "#2C2C2C" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#4CAF50"
          name="arrow.clockwise.icloud.fill"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Backup Geral</ThemedText>
      </ThemedView>

      <ThemedText style={styles.description}>
        Aqui você pode fazer o backup completo dos seus dados de gamificação no Firebase.
        Abaixo você pode ver um resumo dos seus dados e copiar o JSON completo.
      </ThemedText>

      {isLoading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
      ) : backupData && userLevel !== null ? (
        <>
          <ThemedView style={styles.infoContainer}>
            <ThemedText style={styles.infoTitle}>Sua patente atual:</ThemedText>
            <View style={styles.rankContainer}>
              <View style={styles.rankImageContainer}>
                <Image 
                  source={imageMapping[currentRank.path]} 
                  style={styles.rankImage} 
                  resizeMode="contain"
                />
              </View>
              <ThemedText style={styles.rankName}>{currentRank.name}</ThemedText>
              <ThemedText style={styles.rankLevel}>NÍVEL - {userLevel ? userLevel.toLocaleString('pt-BR') : '0'}</ThemedText>
            </View>
            
            <ThemedText style={styles.infoTitle}>Sua experiência é:</ThemedText>
            <ThemedText style={styles.infoValue}>{currentExp ? parseFloat(currentExp.toFixed(2)).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '0'}</ThemedText>
            
            <ThemedText style={styles.infoTitle}>Tempo gasto acumulado nas tarefas:</ThemedText>
            {Object.keys(taskTimes).length > 0 ? (
              Object.keys(taskTimes).map((taskName) => {
                // Só exibir tarefas que têm tempo acumulado e não são objetos de controle
                if (taskTimes[taskName] && 
                    !['currentExp', 'userLevel', 'dailyTaskUsage', 'dailyTimeSpent', 'fallDates', 'vidasData'].includes(taskName)) {
                  return (
                    <ThemedView key={taskName} style={styles.taskItem}>
                      <ThemedText style={styles.taskName}>{taskName}:</ThemedText>
                      <ThemedText style={styles.taskTime}>{taskTimes[taskName]}</ThemedText>
                    </ThemedView>
                  );
                }
                return null;
              })
            ) : (
              <ThemedText style={styles.noTasksText}>Nenhuma tarefa registrada ainda.</ThemedText>
            )}
          </ThemedView>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={() => {
                if (auth.currentUser) {
                  fetchUserData(auth.currentUser.uid);
                }
              }}
            >
              <ThemedText style={styles.buttonText}>
                ATUALIZAR DADOS
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.copyButton} 
              onPress={copyToClipboard}
              disabled={!backupData}
            >
              <ThemedText style={styles.buttonText}>
                COPIAR JSON GERAL
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <ThemedView style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>Sem nada para exibir aqui agora, tente mais tarde.</ThemedText>
        </ThemedView>
      )}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  rankContainer: {
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    padding: 16,
    borderRadius: 8,
    width: "100%",
  },
  rankImageContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  rankImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  rankName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  rankLevel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFD700",
    textAlign: "center",
  },
  headerImage: {
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  description: {
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  infoContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 18,
    marginBottom: 16,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  taskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  taskName: {
    fontSize: 14,
  },
  taskTime: {
    fontSize: 14,
    fontWeight: "bold",
  },
  copyButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },
  refreshButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    width: "100%",
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  loader: {
    marginVertical: 24,
  },
  noDataContainer: {
    marginHorizontal: 16,
    marginVertical: 32,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    fontSize: 16,
    textAlign: "center",
    color: "#757575",
  },
  noTasksText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 8,
    color: "#757575",
  },
});
