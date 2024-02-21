package com.vaadin.hilla.route;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vaadin.flow.component.Component;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.RouteData;
import com.vaadin.flow.router.RouteParameterData;
import com.vaadin.flow.router.Router;
import com.vaadin.flow.server.RouteRegistry;
import com.vaadin.flow.server.VaadinService;
import com.vaadin.flow.server.communication.IndexHtmlResponse;
import com.vaadin.hilla.route.records.AvailableViewInfo;
import com.vaadin.hilla.route.records.ClientViewConfig;
import com.vaadin.hilla.route.records.RouteParamType;
import org.hamcrest.MatcherAssert;
import org.hamcrest.Matchers;
import org.jsoup.nodes.DataNode;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.junit.Before;
import org.junit.Test;
import org.mockito.MockedStatic;
import org.mockito.Mockito;

import java.io.IOException;
import java.net.URL;
import java.util.*;

public class RouteExtractionIndexHtmlRequestListenerTest {

    protected static final String SCRIPT_STRING = RouteExtractionIndexHtmlRequestListener.SCRIPT_STRING
            .replace("%s;", "");

    private final ClientRouteRegistry clientRouteRegistry = Mockito
            .mock(ClientRouteRegistry.class);
    private final RouteExtractionIndexHtmlRequestListener requestListener = new RouteExtractionIndexHtmlRequestListener(
            clientRouteRegistry);
    private IndexHtmlResponse indexHtmlResponse;

    private VaadinService vaadinService;

    @Before
    public void setUp() {
        vaadinService = Mockito.mock(VaadinService.class);
        indexHtmlResponse = Mockito.mock(IndexHtmlResponse.class);

        final Document document = Mockito.mock(Document.class);
        final Element element = new Element("head");
        Mockito.when(document.head()).thenReturn(element);
        Mockito.when(indexHtmlResponse.getDocument()).thenReturn(document);

        final RouteRegistry serverRouteRegistry = Mockito
                .mock(RouteRegistry.class);
        final List<RouteData> flowRegisteredRoutes = prepareServerRoutes();
        Mockito.when(serverRouteRegistry.getRegisteredRoutes())
                .thenReturn(flowRegisteredRoutes);

        final Router router = Mockito.mock(Router.class);
        Mockito.when(vaadinService.getRouter()).thenReturn(router);
        Mockito.when(router.getRegistry()).thenReturn(serverRouteRegistry);

        final List<ClientViewConfig> clientRoutes = prepareClientRoutes();
        Mockito.when(clientRouteRegistry.getAllRoutes())
                .thenReturn(clientRoutes);
    }

    private List<ClientViewConfig> prepareClientRoutes() {
        final List<ClientViewConfig> routes = new ArrayList<>();
        routes.add(new ClientViewConfig("Home", null, "/home", false, false,
                null, Collections.emptyMap(), Collections.emptyMap()));
        routes.add(new ClientViewConfig("Profile", new String[] { "ROLE_USER" },
                "/profile", false, false, null, Collections.emptyMap(),
                Collections.emptyMap()));
        routes.add(new ClientViewConfig("User Profile",
                new String[] { "ROLE_ADMIN" }, "/user/:userId", false, false,
                null, Map.of(":userId", RouteParamType.REQUIRED),
                Collections.emptyMap()));
        return routes;
    }

    private static List<RouteData> prepareServerRoutes() {
        final List<RouteData> flowRegisteredRoutes = new ArrayList<>();
        final RouteData bar = new RouteData(Collections.emptyList(), "bar",
                Collections.emptyList(), Component.class,
                Collections.emptyList());
        flowRegisteredRoutes.add(bar);

        final RouteData foo = new RouteData(Collections.emptyList(), "foo",
                Collections.emptyList(), RouteTarget.class,
                Collections.emptyList());
        flowRegisteredRoutes.add(foo);

        final RouteData wildcard = new RouteData(Collections.emptyList(),
                "wildcard/:___wildcard*",
                Map.of("___wildcard",
                        new RouteParameterData(":___wildcard*", null)),
                RouteTarget.class, Collections.emptyList());
        flowRegisteredRoutes.add(wildcard);

        final RouteData editUser = new RouteData(Collections.emptyList(),
                "/:___userId/edit",
                Map.of("___userId", new RouteParameterData(":___userId", null)),
                RouteTarget.class, Collections.emptyList());
        flowRegisteredRoutes.add(editUser);

        final RouteData comments = new RouteData(Collections.emptyList(),
                "comments/:___commentId?",
                Map.of("___commentId",
                        new RouteParameterData(":___commentId?", null)),
                RouteTarget.class, Collections.emptyList());
        flowRegisteredRoutes.add(comments);
        return flowRegisteredRoutes;
    }

    @Test
    public void should_modifyIndexHtmlResponse()
            throws JsonProcessingException, IOException {
        try (MockedStatic<VaadinService> mocked = Mockito
                .mockStatic(VaadinService.class)) {
            mocked.when(VaadinService::getCurrent).thenReturn(vaadinService);

            requestListener.modifyIndexHtmlResponse(indexHtmlResponse);
        }
        Mockito.verify(indexHtmlResponse, Mockito.times(1)).getDocument();
        MatcherAssert.assertThat(
                indexHtmlResponse.getDocument().head().select("script"),
                Matchers.notNullValue());

        DataNode script = indexHtmlResponse.getDocument().head()
                .select("script").dataNodes().get(0);

        final String scriptText = script.getWholeData();
        MatcherAssert.assertThat(scriptText,
                Matchers.startsWith(SCRIPT_STRING));

        final String views = scriptText.substring(SCRIPT_STRING.length());

        final var mapper = new ObjectMapper();

        var actual = mapper.readTree(views);
        var expected = mapper.readTree(getClass()
                .getResource("/META-INF/VAADIN/available-views.json"));

        MatcherAssert.assertThat(actual, Matchers.is(expected));

    }

    @Test
    public void should_collectServerViews() {
        final List<AvailableViewInfo> viewsList = new ArrayList<>();

        try (MockedStatic<VaadinService> mocked = Mockito
                .mockStatic(VaadinService.class)) {
            mocked.when(VaadinService::getCurrent).thenReturn(vaadinService);

            requestListener.collectServerViews(viewsList);
        }
        MatcherAssert.assertThat(viewsList, Matchers.hasSize(5));
        MatcherAssert.assertThat(viewsList.get(0).title(),
                Matchers.is("Component"));
        MatcherAssert.assertThat(viewsList.get(1).title(),
                Matchers.is("RouteTarget"));
        MatcherAssert.assertThat(viewsList.get(0).route(), Matchers.is("/bar"));
        MatcherAssert.assertThat(viewsList.get(2).routeParameters(),
                Matchers.is(Map.of(":___wildcard*", RouteParamType.WILDCARD)));
        MatcherAssert.assertThat(viewsList.get(3).routeParameters(),
                Matchers.is(Map.of(":___userId", RouteParamType.REQUIRED)));
        MatcherAssert.assertThat(viewsList.get(4).routeParameters(),
                Matchers.is(Map.of(":___commentId?", RouteParamType.OPTIONAL)));

    }

    @Test
    public void should_collectClientViews() {
        final List<AvailableViewInfo> viewsList = new ArrayList<>();
        requestListener.collectClientViews(viewsList);
        MatcherAssert.assertThat(viewsList, Matchers.hasSize(3));
    }

    @PageTitle("RouteTarget")
    private static class RouteTarget extends Component {
    }
}
