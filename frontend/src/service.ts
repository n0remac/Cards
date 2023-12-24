import {
    createConnectTransport,
  } from "@bufbuild/connect-web";
  import {createPromiseClient} from "@bufbuild/connect";
  import { CardService } from "@/rpc/proto/card/card_connect";
  import { BiomeService } from "@/rpc/proto/biome/biome_connect";
  import { UserService } from "@/rpc/proto/user/user_connect";


  
  export const baseURL = process.env.BASE_URL;
  
  export const transport = createConnectTransport({
    baseUrl: `${baseURL}` || 'error',
    // credentials: "include",
  });
  
  export const cardService = createPromiseClient(CardService, transport);
  export const biomeService = createPromiseClient(BiomeService, transport);
  export const userService = createPromiseClient(UserService, transport);
  