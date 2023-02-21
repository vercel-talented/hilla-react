package dev.hilla.parser.plugins.backbone;

import java.util.Optional;

import javax.annotation.Nonnull;

import dev.hilla.parser.core.AbstractPlugin;
import dev.hilla.parser.core.Node;
import dev.hilla.parser.core.NodeDependencies;
import dev.hilla.parser.core.NodePath;
import dev.hilla.parser.core.RootNode;
import dev.hilla.parser.models.ClassInfoModel;
import dev.hilla.parser.models.MethodInfoModel;
import dev.hilla.parser.plugins.backbone.nodes.EndpointExposedNode;
import dev.hilla.parser.plugins.backbone.nodes.EndpointNode;
import dev.hilla.parser.plugins.backbone.nodes.MethodNode;

import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;

public final class MethodPlugin
        extends AbstractPlugin<BackbonePluginConfiguration> {
    public static final String MEDIA_TYPE = "application/json";

    @Override
    public void enter(NodePath<?> nodePath) {
        if (!(nodePath.getNode() instanceof MethodNode)) {
            return;
        }

        var methodNode = (MethodNode) nodePath.getNode();

        var endpointParent = findClosestEndpoint(nodePath);
        if (endpointParent.isEmpty()) {
            return;
        }

        var endpointNode = (EndpointNode) endpointParent.get();

        methodNode.getTarget().post(createOperation(endpointNode, methodNode));
    }

    @Override
    public void exit(NodePath<?> nodePath) {
        if (!(nodePath.getNode() instanceof MethodNode)) {
            return;
        }

        var methodNode = (MethodNode) nodePath.getNode();

        var endpointParent = findClosestEndpoint(nodePath);
        if (endpointParent.isEmpty()) {
            return;
        }

        var endpointNode = (EndpointNode) endpointParent.get();

        var endpointName = endpointNode.getTarget().getName();
        var methodName = methodNode.getSource().getName();

        var rootNode = (RootNode) nodePath.getRootPath().getNode();
        rootNode.getTarget().path("/" + endpointName + "/" + methodName,
                methodNode.getTarget());
        // The class name is needed to map the endpoint to its implementation at
        // runtime
        endpointNode.getTarget().addExtension("x-class-name",
                endpointNode.getSource().getName());
    }

    @Nonnull
    @Override
    public NodeDependencies scan(@Nonnull NodeDependencies nodeDependencies) {
        var node = nodeDependencies.getNode();
        if (node instanceof EndpointNode
                || node instanceof EndpointExposedNode) {
            var endpointCls = (ClassInfoModel) node.getSource();
            var methodNodes = endpointCls.getMethods().stream()
                    .filter(MethodInfoModel::isPublic)
                    .<Node<?, ?>> map(MethodNode::of);
            return nodeDependencies.appendChildNodes(methodNodes);
        }

        return nodeDependencies;
    }

    private Operation createOperation(EndpointNode endpointNode,
            MethodNode methodNode) {
        var operation = new Operation();

        var endpointName = endpointNode.getTarget().getName();

        operation
                .operationId(String.format("%s_%s_POST", endpointName,
                        methodNode.getSource().getName()))
                .addTagsItem(endpointName).responses(createResponses());

        return operation;
    }

    private ApiResponses createResponses() {
        var response = new ApiResponse().description("");
        return new ApiResponses().addApiResponse("200", response);
    }

    private Optional<Node<?, ?>> findClosestEndpoint(NodePath<?> nodePath) {
        return nodePath.getParentPath().stream()
                .<Node<?, ?>> map(NodePath::getNode)
                .filter(n -> n instanceof EndpointNode).findFirst();
    }
}
