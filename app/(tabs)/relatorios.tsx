import { Image } from "expo-image";
import { StyleSheet } from "react-native";

import { Collapsible } from "@/components/Collapsible";
import { ExternalLink } from "@/components/ExternalLink";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";

export default function RelatoriosScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#E8E8E8", dark: "#2C2C2C" }}
      headerImage={
        <IconSymbol
          size={310}
          color="#4CAF50"
          name="chart.bar.fill"
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Relatórios</ThemedText>
      </ThemedView>

      <ThemedText>
        Aqui você pode visualizar, analisar e exportar seus relatórios de
        desempenho e progresso.
      </ThemedText>

      <Collapsible title="Relatório de Vendas">
        <ThemedText>
          Este relatório apresenta o desempenho de vendas no período
          selecionado, incluindo metas atingidas e comparativos.
        </ThemedText>
        <Image
          //source={require('@/assets/images/chart-example.png')}
          style={{ alignSelf: "center", width: 200, height: 200 }}
        />
      </Collapsible>

      <Collapsible title="Relatório de Produtividade">
        <ThemedText>
          Dados sobre eficiência e tempo gasto em tarefas, ajudando a otimizar
          processos internos.
        </ThemedText>
      </Collapsible>

      <Collapsible title="Exportar Relatórios">
        <ThemedText>
          Exporte seus relatórios em PDF ou Excel para compartilhar com sua
          equipe ou clientes.
        </ThemedText>
        <ExternalLink href="https://docs.expo.dev/versions/latest/sdk/sharing">
          <ThemedText type="link">Saiba mais sobre exportação</ThemedText>
        </ExternalLink>
      </Collapsible>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    bottom: -90,
    left: -35,
    position: "absolute",
  },
  titleContainer: {
    flexDirection: "row",
    gap: 8,
  },
});
