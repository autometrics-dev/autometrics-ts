import ts, { factory } from "typescript";

/**
* Creates nodes for necessary Open Telemetry imports and meter, exporter instantiations
*
* @param port {number} - which port should exporter be available on
*/
export function createAutometricsHeader(port: number): ts.Node[] {
	return [
		factory.createImportDeclaration(
			undefined,
			factory.createImportClause(
				false,
				undefined,
				factory.createNamedImports([factory.createImportSpecifier(
					false,
					undefined,
					factory.createIdentifier("PrometheusExporter")
				)])
			),
			factory.createStringLiteral("@opentelemetry/exporter-prometheus"),
			undefined
		),
		factory.createImportDeclaration(
			undefined,
			factory.createImportClause(
				false,
				undefined,
				factory.createNamedImports([factory.createImportSpecifier(
					false,
					undefined,
					factory.createIdentifier("MeterProvider")
				)])
			),
			factory.createStringLiteral("@opentelemetry/sdk-metrics"),
			undefined
		),
		factory.createVariableDeclarationList(
			[factory.createVariableDeclaration(
				factory.createIdentifier("exporter"),
				undefined,
				undefined,
				factory.createNewExpression(
					factory.createIdentifier("PrometheusExporter"),
					undefined,
					[factory.createObjectLiteralExpression(
						[
							factory.createPropertyAssignment(
								factory.createIdentifier("port"),
								factory.createNumericLiteral(port.toString())
							),
						],
						false
					)]
				)
			)],
			ts.NodeFlags.Const
		),
		factory.createVariableDeclarationList(
			[factory.createVariableDeclaration(
				factory.createIdentifier("meterProvider"),
				undefined,
				undefined,
				factory.createNewExpression(
					factory.createIdentifier("MeterProvider"),
					undefined,
					[]
				)
			)],
			ts.NodeFlags.Const
		),
		factory.createExpressionStatement(factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier("meterProvider"),
				factory.createIdentifier("addMetricReader")
			),
			undefined,
			[factory.createIdentifier("exporter")]
		)),
		factory.createVariableDeclarationList(
			[factory.createVariableDeclaration(
				factory.createIdentifier("meter"),
				undefined,
				undefined,
				factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier("meterProvider"),
						factory.createIdentifier("getMeter")
					),
					undefined,
					[factory.createStringLiteral("example-prometheus")] //FIXME: this prob needs to be dynamic
				)
			)],
			ts.NodeFlags.Const
		)


	]
}

/**
* Creates nodes for initiating histogram at the top of the function
*/
export function createAutometricsInit(): ts.Node[] {
	return [
		factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier("__autometricsHistogram"),
					undefined,
					undefined,
					factory.createCallExpression(
						factory.createPropertyAccessExpression(
							factory.createIdentifier("meter"),
							factory.createIdentifier("createHistogram")
						),
						undefined,
						[
							factory.createStringLiteral("function.calls.duration"),
							factory.createObjectLiteralExpression(
								[factory.createPropertyAssignment(
									factory.createIdentifier("description"),
									factory.createStringLiteral("Autometrics histogram for tracking function calls")
								)],
								true
							)
						]
					)
				)],
				ts.NodeFlags.Const
			)
		),
		factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier("__autometricsStart"),
					undefined,
					undefined,
					factory.createCallExpression(
						factory.createPropertyAccessExpression(
							factory.createNewExpression(
								factory.createIdentifier("Date"),
								undefined,
								[]
							),
							factory.createIdentifier("getTime")
						),
						undefined,
						[]
					)
				)],
				ts.NodeFlags.Const
			)
		)

	]
}

/**
* Creates nodes for recording the histogram value.
*
* @param functionIdentifier {string} - the name of the function to create the default label on 
* TODO: custom labels
*/
export function createAutometricsReturn(functionIdentifier: string): ts.Node[] {
	return [
		factory.createVariableStatement(
			undefined,
			factory.createVariableDeclarationList(
				[factory.createVariableDeclaration(
					factory.createIdentifier("__autometricsDuration"),
					undefined,
					undefined,
					factory.createBinaryExpression(
						factory.createCallExpression(
							factory.createPropertyAccessExpression(
								factory.createNewExpression(
									factory.createIdentifier("Date"),
									undefined,
									[]
								),
								factory.createIdentifier("getTime")
							),
							undefined,
							[]
						),
						factory.createToken(ts.SyntaxKind.MinusToken),
						factory.createIdentifier("__autometricsStart")
					)
				)],
				ts.NodeFlags.Const
			)
		),
		factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createIdentifier("__autometricsHistogram"),
				factory.createIdentifier("record")
			),
			undefined,
			[
				factory.createIdentifier("__autometricsDuration"),
				factory.createObjectLiteralExpression(
					[factory.createPropertyAssignment(
						factory.createStringLiteral("function"),
						factory.createStringLiteral(functionIdentifier)
					)],
					false
				)
			]
		)
	]
}

